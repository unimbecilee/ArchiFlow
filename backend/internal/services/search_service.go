package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"github.com/meilisearch/meilisearch-go"
)

type SearchService struct {
	client       meilisearch.ServiceManager
	documentRepo *repository.DocumentRepository
	enabled      bool
	indexUID     string
}

type searchDoc struct {
	ID             uint   `json:"id"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	FileName       string `json:"file_name"`
	Category       string `json:"category"`
	Classification string `json:"classification"`
	OCRText        string `json:"ocr_text"`
	OwnerID        uint   `json:"owner_id"`
	FolderID       uint   `json:"folder_id"`
	MimeType       string `json:"mime_type"`
}

func NewSearchService(documentRepo *repository.DocumentRepository) *SearchService {
	host := strings.TrimSpace(os.Getenv("MEILISEARCH_HOST"))
	if host == "" {
		host = strings.TrimSpace(os.Getenv("MEILI_HOST"))
	}
	apiKey := os.Getenv("MEILISEARCH_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("MEILI_MASTER_KEY")
	}
	if host == "" {
		return &SearchService{documentRepo: documentRepo, enabled: false, indexUID: "documents"}
	}
	client := meilisearch.New(host, meilisearch.WithAPIKey(apiKey))
	s := &SearchService{client: client, documentRepo: documentRepo, enabled: true, indexUID: "documents"}
	if err := s.EnsureIndex(context.Background()); err != nil {
		log.Printf("meilisearch ensure index: %v", err)
		s.enabled = false
	}
	return s
}

func (s *SearchService) Enabled() bool { return s != nil && s.enabled && s.client != nil }

func (s *SearchService) EnsureIndex(ctx context.Context) error {
	if s == nil || s.client == nil {
		return nil
	}
	idx := s.client.Index(s.indexUID)
	_, err := idx.UpdateFilterableAttributes(&[]string{"id", "owner_id", "classification", "category", "folder_id", "mime_type"})
	if err != nil {
		return err
	}
	_, err = idx.UpdateSearchableAttributes(&[]string{"title", "description", "file_name", "ocr_text", "category"})
	return err
}

func (s *SearchService) IndexDocument(ctx context.Context, doc *models.Document) error {
	if !s.Enabled() || doc == nil {
		return nil
	}
	folderID := uint(0)
	if doc.FolderID != nil {
		folderID = *doc.FolderID
	}
	_, err := s.client.Index(s.indexUID).AddDocuments([]searchDoc{{
		ID:             doc.ID,
		Title:          doc.Title,
		Description:    doc.Description,
		FileName:       doc.FileName,
		Category:       doc.Category,
		Classification: doc.Classification,
		OCRText:        doc.OCRText,
		OwnerID:        doc.OwnerID,
		FolderID:       folderID,
		MimeType:       doc.MimeType,
	}}, "id")
	return err
}

func (s *SearchService) DeleteDocument(ctx context.Context, id uint) error {
	if !s.Enabled() {
		return nil
	}
	_, err := s.client.Index(s.indexUID).DeleteDocument(strconv.FormatUint(uint64(id), 10))
	return err
}

func (s *SearchService) SearchWithFacets(ctx context.Context, ownerID uint, isAdmin bool, query string, filters map[string]string, limit int, offset int) ([]models.Document, int64, map[string]map[string]int64, error) {
	query = strings.TrimSpace(query)
	if len(query) < 2 {
		return nil, 0, nil, fmt.Errorf("query must be at least 2 characters")
	}
	if limit <= 0 {
		limit = 50
	}
	if s.Enabled() {
		docs, total, facets, err := s.searchMeili(ctx, ownerID, isAdmin, query, filters, limit, offset)
		// Index Meili souvent partiel : 0 hit → fallback Postgres (ILIKE / FTS).
		if err == nil && total > 0 && len(docs) > 0 {
			return docs, total, facets, nil
		}
		if err != nil {
			log.Printf("meilisearch fallback to postgres: %v", err)
		}
	}
	return s.searchPostgres(ownerID, isAdmin, query, filters, limit, offset)
}

func (s *SearchService) searchPostgres(ownerID uint, isAdmin bool, query string, filters map[string]string, limit, offset int) ([]models.Document, int64, map[string]map[string]int64, error) {
	docs, err := s.documentRepo.SearchFullText(ownerID, isAdmin, query, 200)
	if err != nil || len(docs) == 0 {
		docs, err = s.documentRepo.Search(ownerID, isAdmin, query, 200)
	}
	if err != nil {
		return nil, 0, nil, err
	}
	docs = filterDocumentsByMeta(docs, filters)
	total := int64(len(docs))
	if offset > 0 {
		if offset >= len(docs) {
			docs = nil
		} else {
			docs = docs[offset:]
		}
	}
	if limit > 0 && len(docs) > limit {
		docs = docs[:limit]
	}
	return docs, total, nil, nil
}

func filterDocumentsByMeta(docs []models.Document, filters map[string]string) []models.Document {
	if len(filters) == 0 || len(docs) == 0 {
		return docs
	}
	classWant := strings.TrimSpace(filters["classification"])
	catWant := strings.TrimSpace(filters["category"])
	if classWant == "" && catWant == "" {
		return docs
	}
	out := make([]models.Document, 0, len(docs))
	for _, d := range docs {
		if classWant != "" && !strings.EqualFold(d.Classification, classWant) {
			continue
		}
		if catWant != "" && !strings.EqualFold(d.Category, catWant) {
			continue
		}
		out = append(out, d)
	}
	return out
}

func (s *SearchService) searchMeili(ctx context.Context, ownerID uint, isAdmin bool, query string, filters map[string]string, limit int, offset int) ([]models.Document, int64, map[string]map[string]int64, error) {
	var parts []string
	if !isAdmin {
		sharedIDs, _ := s.documentRepo.ListSharedDocumentIDs(ownerID)
		if len(sharedIDs) == 0 {
			parts = append(parts, fmt.Sprintf("owner_id = %d", ownerID))
		} else {
			ids := make([]string, 0, len(sharedIDs))
			for _, id := range sharedIDs {
				ids = append(ids, strconv.FormatUint(uint64(id), 10))
			}
			parts = append(parts, fmt.Sprintf("(owner_id = %d OR id IN [%s])", ownerID, strings.Join(ids, ", ")))
		}
	}
	if v := strings.TrimSpace(filters["classification"]); v != "" {
		parts = append(parts, fmt.Sprintf("classification = %q", v))
	}
	if v := strings.TrimSpace(filters["category"]); v != "" {
		parts = append(parts, fmt.Sprintf("category = %q", v))
	}
	req := &meilisearch.SearchRequest{
		Limit:                int64(limit),
		Offset:               int64(offset),
		Facets:               []string{"classification", "category"},
		AttributesToRetrieve: []string{"id"},
	}
	if len(parts) > 0 {
		req.Filter = strings.Join(parts, " AND ")
	}
	res, err := s.client.Index(s.indexUID).Search(query, req)
	if err != nil {
		return nil, 0, nil, err
	}
	ids := make([]uint, 0, len(res.Hits))
	for _, hit := range res.Hits {
		id, ok := hitID(hit)
		if !ok {
			continue
		}
		ids = append(ids, id)
	}
	docs := make([]models.Document, 0, len(ids))
	for _, id := range ids {
		d, err := s.documentRepo.FindByID(id)
		if err != nil {
			continue
		}
		docs = append(docs, *d)
	}
	facets := parseFacetDistribution(res.FacetDistribution)
	return docs, res.EstimatedTotalHits, facets, nil
}

func hitID(hit any) (uint, bool) {
	switch m := hit.(type) {
	case map[string]any:
		return coerceUint(m["id"])
	default:
		b, err := json.Marshal(hit)
		if err != nil {
			return 0, false
		}
		var decoded map[string]any
		if err := json.Unmarshal(b, &decoded); err != nil {
			return 0, false
		}
		return coerceUint(decoded["id"])
	}
}

func coerceUint(v any) (uint, bool) {
	switch n := v.(type) {
	case float64:
		return uint(n), true
	case int64:
		return uint(n), true
	case int:
		return uint(n), true
	case json.Number:
		i, err := n.Int64()
		if err != nil {
			return 0, false
		}
		return uint(i), true
	case string:
		i, err := strconv.ParseUint(n, 10, 64)
		if err != nil {
			return 0, false
		}
		return uint(i), true
	default:
		return 0, false
	}
}

func parseFacetDistribution(raw any) map[string]map[string]int64 {
	out := map[string]map[string]int64{}
	if raw == nil {
		return out
	}
	switch v := raw.(type) {
	case map[string]map[string]int64:
		return v
	case map[string]any:
		for k, inner := range v {
			out[k] = facetCounts(inner)
		}
	default:
		b, err := json.Marshal(raw)
		if err != nil {
			return out
		}
		var decoded map[string]map[string]float64
		if err := json.Unmarshal(b, &decoded); err != nil {
			return out
		}
		for k, inner := range decoded {
			m := map[string]int64{}
			for fk, fv := range inner {
				m[fk] = int64(fv)
			}
			out[k] = m
		}
	}
	return out
}

func facetCounts(raw any) map[string]int64 {
	inner := map[string]int64{}
	m, ok := raw.(map[string]any)
	if !ok {
		return inner
	}
	for fk, fv := range m {
		switch n := fv.(type) {
		case float64:
			inner[fk] = int64(n)
		case int64:
			inner[fk] = n
		}
	}
	return inner
}
