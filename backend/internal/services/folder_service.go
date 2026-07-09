package services

import (
	"errors"
	"fmt"
	"strings"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"

	"gorm.io/gorm"
)

type FolderService struct {
	repo    *repository.FolderRepository
	docRepo *repository.DocumentRepository
}

func NewFolderService(repo *repository.FolderRepository, docRepo *repository.DocumentRepository) *FolderService {
	return &FolderService{repo: repo, docRepo: docRepo}
}

type FolderWithCounts struct {
	models.Folder
	SubfoldersCount int64 `json:"subfolders_count"`
	DocumentsCount  int64 `json:"documents_count"`
}

func (s *FolderService) List(userID uint, isAdmin bool, parentID *uint) ([]FolderWithCounts, error) {
	rows, err := s.repo.ListByOwner(userID, parentID, isAdmin)
	if err != nil {
		return nil, err
	}
	out := make([]FolderWithCounts, 0, len(rows))
	if len(rows) == 0 {
		return out, nil
	}
	ids := make([]uint, len(rows))
	for i, f := range rows {
		ids[i] = f.ID
	}
	sfMap, docMap, err := s.repo.BatchCountChildren(ids, userID, isAdmin)
	if err != nil {
		return nil, err
	}
	for _, f := range rows {
		out = append(out, FolderWithCounts{
			Folder:          f,
			SubfoldersCount: sfMap[f.ID],
			DocumentsCount:  docMap[f.ID],
		})
	}
	return out, nil
}

func (s *FolderService) Get(id uint) (*models.Folder, error) {
	return s.repo.FindByID(id)
}

type CreateFolderInput struct {
	Name        string
	Description string
	ParentID    *uint
	OwnerID     uint
}

func (s *FolderService) Create(in CreateFolderInput, isAdmin bool) (*models.Folder, error) {
	name, err := sanitizeFolderName(in.Name)
	if err != nil {
		return nil, err
	}
	ownerID := in.OwnerID
	if in.ParentID != nil {
		if err := s.CanAccess(*in.ParentID, in.OwnerID, isAdmin); err != nil {
			return nil, fmt.Errorf("forbidden parent folder")
		}
		parent, err := s.repo.FindByID(*in.ParentID)
		if err != nil {
			return nil, fmt.Errorf("parent folder not found")
		}
		ownerID = parent.OwnerID
	}
	f := &models.Folder{
		Name:        name,
		Description: in.Description,
		OwnerID:     ownerID,
		ParentID:    in.ParentID,
	}
	if err := s.repo.Create(f); err != nil {
		return nil, err
	}
	return f, nil
}

func sanitizeFolderName(raw string) (string, error) {
	name := strings.TrimSpace(raw)
	if name == "" {
		return "", fmt.Errorf("name is required")
	}
	var b strings.Builder
	for _, r := range name {
		if r == '/' || r == '\\' || r == 0 {
			continue
		}
		b.WriteRune(r)
	}
	name = strings.TrimSpace(b.String())
	if name == "" {
		return "", fmt.Errorf("name is required")
	}
	if len(name) > 255 {
		name = name[:255]
	}
	return name, nil
}

func (s *FolderService) Update(id, ownerID uint, isAdmin bool, name, description string) (*models.Folder, error) {
	f, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !isAdmin && f.OwnerID != ownerID {
		return nil, errors.New("forbidden")
	}
	if name != "" {
		sanitized, err := sanitizeFolderName(name)
		if err != nil {
			return nil, err
		}
		f.Name = sanitized
	}
	f.Description = description
	if err := s.repo.Update(f); err != nil {
		return nil, err
	}
	return f, nil
}

func (s *FolderService) Delete(id, ownerID uint, isAdmin bool, recursive bool) error {
	f, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if !isAdmin && f.OwnerID != ownerID {
		return errors.New("forbidden")
	}
	sf, doc, _ := s.repo.CountChildren(id, ownerID, isAdmin)
	if sf > 0 || doc > 0 {
		if !recursive {
			return fmt.Errorf("folder not empty")
		}
		return s.deleteRecursive(id, ownerID, isAdmin)
	}
	return s.repo.Delete(id, ownerID, isAdmin)
}

func (s *FolderService) deleteRecursive(id, ownerID uint, isAdmin bool) error {
	ids, err := s.repo.CollectSubtreeIDs(id)
	if err != nil {
		return err
	}
	ordered, err := s.repo.OrderSubtreeByDepthDesc(ids)
	if err != nil {
		return err
	}
	return s.repo.GetDB().Transaction(func(tx *gorm.DB) error {
		fr := repository.NewFolderRepository(tx)
		dr := repository.NewDocumentRepository(tx)
		if _, err := dr.SoftDeleteByFolderIDs(ids, ownerID, isAdmin); err != nil {
			return err
		}
		for _, fid := range ordered {
			if err := fr.Delete(fid, ownerID, isAdmin); err != nil {
				return err
			}
		}
		return nil
	})
}

type FolderBreadcrumbItem struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

type FolderFlatOption struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Path string `json:"path"`
}

func (s *FolderService) Breadcrumb(id uint, userID uint, isAdmin bool) ([]FolderBreadcrumbItem, error) {
	f, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !isAdmin && f.OwnerID != userID {
		return nil, errors.New("forbidden")
	}
	chain := []FolderBreadcrumbItem{{ID: f.ID, Name: f.Name}}
	for f.ParentID != nil {
		parent, err := s.repo.FindByID(*f.ParentID)
		if err != nil {
			break
		}
		if !isAdmin && parent.OwnerID != userID {
			break
		}
		chain = append([]FolderBreadcrumbItem{{ID: parent.ID, Name: parent.Name}}, chain...)
		f = parent
	}
	return chain, nil
}

func (s *FolderService) ListFlat(userID uint, isAdmin bool) ([]FolderFlatOption, error) {
	all, err := s.repo.ListAllByOwner(userID, isAdmin)
	if err != nil {
		return nil, err
	}
	byID := make(map[uint]models.Folder, len(all))
	for _, f := range all {
		byID[f.ID] = f
	}
	pathFor := func(id uint) string {
		var parts []string
		seen := make(map[uint]bool)
		cur, ok := byID[id]
		for ok && !seen[cur.ID] {
			seen[cur.ID] = true
			parts = append([]string{cur.Name}, parts...)
			if cur.ParentID == nil {
				break
			}
			cur, ok = byID[*cur.ParentID]
		}
		return strings.Join(parts, " / ")
	}
	out := make([]FolderFlatOption, 0, len(all))
	for _, f := range all {
		out = append(out, FolderFlatOption{
			ID:   f.ID,
			Name: f.Name,
			Path: pathFor(f.ID),
		})
	}
	return out, nil
}

func (s *FolderService) CanAccess(folderID uint, userID uint, isAdmin bool) error {
	if isAdmin {
		return nil
	}
	f, err := s.repo.FindByID(folderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("folder not found")
		}
		return err
	}
	if f.OwnerID != userID {
		return errors.New("forbidden")
	}
	return nil
}
