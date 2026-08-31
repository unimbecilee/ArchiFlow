package repository

import (
	"strings"
	"time"

	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type DocumentRepository struct {
	db *gorm.DB
}

func NewDocumentRepository(db *gorm.DB) *DocumentRepository {
	return &DocumentRepository{db: db}
}

func (r *DocumentRepository) Create(d *models.Document) error {
	return r.db.Create(d).Error
}

func (r *DocumentRepository) UpdateOCRText(id uint, text string) error {
	return r.db.Model(&models.Document{}).Where("id = ?", id).Update("ocr_text", text).Error
}

func (r *DocumentRepository) FindByID(id uint) (*models.Document, error) {
	var d models.Document
	if err := r.db.Where("is_deleted = ?", false).First(&d, id).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DocumentRepository) ListByOwner(ownerID uint, folderID *uint, admin bool) ([]models.Document, error) {
	var rows []models.Document
	q := r.db.Where("is_deleted = ?", false)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	if folderID == nil {
		q = q.Where("folder_id IS NULL")
	} else {
		q = q.Where("folder_id = ?", *folderID)
	}
	return rows, q.Order("created_at DESC").Find(&rows).Error
}

func (r *DocumentRepository) Update(d *models.Document) error {
	return r.db.Save(d).Error
}

func (r *DocumentRepository) ListSharedDocumentIDs(userID uint) ([]uint, error) {
	var ids []uint
	err := r.db.Table("document_shares").
		Where("shared_with_id = ? AND active = ?", userID, true).
		Pluck("document_id", &ids).Error
	return ids, err
}

func (r *DocumentRepository) SoftDelete(id uint, ownerID uint, admin bool) error {
	q := r.db.Model(&models.Document{}).Where("id = ? AND is_deleted = ?", id, false)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	return q.Update("is_deleted", true).Error
}

func (r *DocumentRepository) HardDelete(id uint, ownerID uint, admin bool) error {
	q := r.db.Where("id = ? AND is_deleted = ?", id, true)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	res := q.Delete(&models.Document{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *DocumentRepository) SoftDeleteByFolderIDs(folderIDs []uint, ownerID uint, admin bool) (int64, error) {
	if len(folderIDs) == 0 {
		return 0, nil
	}
	q := r.db.Model(&models.Document{}).
		Where("folder_id IN ? AND is_deleted = ?", folderIDs, false)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	res := q.Update("is_deleted", true)
	return res.RowsAffected, res.Error
}

// OwnerHasLockedOrValidatingFile true si fichier même nom EN_VALIDATION ou verrouillé.
func (r *DocumentRepository) OwnerHasLockedOrValidatingFile(ownerID uint, fileName string) (bool, error) {
	var n int64
	err := r.db.Model(&models.Document{}).
		Where("owner_id = ? AND is_deleted = ? AND file_name = ?", ownerID, false, fileName).
		Where("status = ? OR locked_by_id IS NOT NULL", models.DocumentStatusValidation).
		Count(&n).Error
	return n > 0, err
}

func (r *DocumentRepository) ListTrash(ownerID uint, admin bool, limit int) ([]models.Document, error) {
	var rows []models.Document
	q := r.db.Where("is_deleted = ?", true)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	if limit <= 0 {
		limit = 100
	}
	return rows, q.Order("updated_at DESC").Limit(limit).Find(&rows).Error
}

func (r *DocumentRepository) Restore(id uint, ownerID uint, admin bool) error {
	q := r.db.Model(&models.Document{}).Where("id = ? AND is_deleted = ?", id, true)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	return q.Update("is_deleted", false).Error
}

func (r *DocumentRepository) Search(ownerID uint, admin bool, query string, limit int) ([]models.Document, error) {
	return r.search(ownerID, admin, query, limit, false)
}

func (r *DocumentRepository) SearchFullText(ownerID uint, admin bool, query string, limit int) ([]models.Document, error) {
	return r.search(ownerID, admin, query, limit, true)
}

func (r *DocumentRepository) search(ownerID uint, admin bool, query string, limit int, fullText bool) ([]models.Document, error) {
	var rows []models.Document
	q := r.db.Where("is_deleted = ?", false)
	if !admin {
		q = q.Where(
			`(owner_id = ? OR id IN (SELECT document_id FROM document_shares WHERE shared_with_id = ?))`,
			ownerID, ownerID,
		)
	}
	if fullText {
		tsQuery := strings.TrimSpace(query)
		if tsQuery == "" {
			return rows, nil
		}
		q = q.Where(
			`to_tsvector('french', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(file_name,'') || ' ' || coalesce(ocr_text,''))
			@@ plainto_tsquery('french', ?)`,
			tsQuery,
		)
	} else {
		pattern := "%" + query + "%"
		q = q.Where(
			`(title ILIKE ? OR description ILIKE ? OR file_name ILIKE ? OR category ILIKE ? OR ocr_text ILIKE ?
			OR id IN (
				SELECT dtl.document_id FROM document_tag_links dtl
				JOIN document_tags dt ON dt.id = dtl.tag_id
				WHERE dt.name ILIKE ?
			))`,
			pattern, pattern, pattern, pattern, pattern, pattern,
		)
	}
	if limit <= 0 {
		limit = 50
	}
	return rows, q.Order("updated_at DESC").Limit(limit).Find(&rows).Error
}

func (r *DocumentRepository) ListRecent(ownerID uint, admin bool, limit int) ([]models.Document, error) {
	var rows []models.Document
	q := r.db.Where("is_deleted = ?", false)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	if limit <= 0 {
		limit = 20
	}
	return rows, q.Order("updated_at DESC").Limit(limit).Find(&rows).Error
}

func (r *DocumentRepository) CountActive(ownerID uint, admin bool) (int64, error) {
	var n int64
	q := r.db.Model(&models.Document{}).Where("is_deleted = ?", false)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	return n, q.Count(&n).Error
}

func (r *DocumentRepository) SetLock(id uint, userID uint) error {
	now := time.Now()
	return r.db.Model(&models.Document{}).Where("id = ? AND is_deleted = ?", id, false).
		Updates(map[string]any{
			"locked_by_id": userID,
			"locked_at":    &now,
		}).Error
}

func (r *DocumentRepository) ClearLock(id uint) error {
	return r.db.Model(&models.Document{}).Where("id = ?", id).
		Updates(map[string]any{
			"locked_by_id": nil,
			"locked_at":    nil,
		}).Error
}

func (r *DocumentRepository) FindByIDIncludeDeleted(id uint) (*models.Document, error) {
	var d models.Document
	if err := r.db.First(&d, id).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DocumentRepository) CountTrash(ownerID uint, admin bool) (int64, error) {
	var n int64
	q := r.db.Model(&models.Document{}).Where("is_deleted = ?", true)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	return n, q.Count(&n).Error
}

func (r *DocumentRepository) UpsertPydioSync(row *models.PydioDocumentSync) error {
	var existing models.PydioDocumentSync
	err := r.db.Where("pydio_node_id = ?", row.PydioNodeID).First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		return r.db.Create(row).Error
	}
	if err != nil {
		return err
	}
	row.ID = existing.ID
	return r.db.Save(row).Error
}

func (r *DocumentRepository) DeletePydioSyncByNodeID(nodeID string) error {
	return r.db.Where("pydio_node_id = ?", nodeID).Delete(&models.PydioDocumentSync{}).Error
}

func (r *DocumentRepository) ListPydioSync(limit int) ([]models.PydioDocumentSync, error) {
	var rows []models.PydioDocumentSync
	q := r.db.Order("updated_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	return rows, q.Find(&rows).Error
}

func (r *DocumentRepository) LinkPydioSync(nodeID string, documentID uint) error {
	return r.db.Model(&models.PydioDocumentSync{}).
		Where("pydio_node_id = ?", nodeID).
		Updates(map[string]any{
			"archiflow_document_id": documentID,
			"sync_status":           "synced",
		}).Error
}

// SumSizeByOwner returns total bytes stored for a user (non-deleted documents).
func (r *DocumentRepository) SumSizeByOwner(ownerID uint) (int64, error) {
	var total int64
	err := r.db.Model(&models.Document{}).
		Where("owner_id = ? AND is_deleted = ?", ownerID, false).
		Select("COALESCE(SUM(size), 0)").
		Scan(&total).Error
	return total, err
}

// Cursor pagination helpers (keyset pagination on created_at DESC, id DESC)

type Cursor struct {
	CreatedAt string `json:"created_at"`
	ID        uint   `json:"id"`
}

func (r *DocumentRepository) ListByOwnerCursor(ownerID uint, folderID *uint, admin bool, limit int, cursor *Cursor) ([]models.Document, *Cursor, error) {
	var rows []models.Document
	q := r.db.Where("is_deleted = ?", false)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	if folderID == nil {
		q = q.Where("folder_id IS NULL")
	} else {
		q = q.Where("folder_id = ?", *folderID)
	}
	if cursor != nil && cursor.ID > 0 {
		q = q.Where("(created_at, id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}
	if limit <= 0 {
		limit = 50
	}
	err := q.Order("created_at DESC, id DESC").Limit(limit + 1).Find(&rows).Error
	if err != nil {
		return nil, nil, err
	}
	var nextCursor *Cursor
	if len(rows) > limit {
		rows = rows[:limit]
		last := rows[len(rows)-1]
		nextCursor = &Cursor{CreatedAt: last.CreatedAt.UTC().Format(time.RFC3339Nano), ID: last.ID}
	}
	return rows, nextCursor, nil
}

func (r *DocumentRepository) ListTrashCursor(ownerID uint, admin bool, limit int, cursor *Cursor) ([]models.Document, *Cursor, error) {
	var rows []models.Document
	q := r.db.Where("is_deleted = ?", true)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	if cursor != nil && cursor.ID > 0 {
		q = q.Where("(updated_at, id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}
	if limit <= 0 {
		limit = 50
	}
	err := q.Order("updated_at DESC, id DESC").Limit(limit + 1).Find(&rows).Error
	if err != nil {
		return nil, nil, err
	}
	var nextCursor *Cursor
	if len(rows) > limit {
		rows = rows[:limit]
		last := rows[len(rows)-1]
		nextCursor = &Cursor{CreatedAt: last.UpdatedAt.UTC().Format(time.RFC3339Nano), ID: last.ID}
	}
	return rows, nextCursor, nil
}

func (r *DocumentRepository) ListRecentCursor(ownerID uint, admin bool, limit int, cursor *Cursor) ([]models.Document, *Cursor, error) {
	var rows []models.Document
	q := r.db.Where("is_deleted = ?", false)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	if cursor != nil && cursor.ID > 0 {
		q = q.Where("(updated_at, id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}
	if limit <= 0 {
		limit = 20
	}
	err := q.Order("updated_at DESC, id DESC").Limit(limit + 1).Find(&rows).Error
	if err != nil {
		return nil, nil, err
	}
	var nextCursor *Cursor
	if len(rows) > limit {
		rows = rows[:limit]
		last := rows[len(rows)-1]
		nextCursor = &Cursor{CreatedAt: last.UpdatedAt.UTC().Format(time.RFC3339Nano), ID: last.ID}
	}
	return rows, nextCursor, nil
}

func (r *DocumentRepository) SearchCursor(ownerID uint, admin bool, query string, limit int, cursor *Cursor, fullText bool) ([]models.Document, *Cursor, error) {
	var rows []models.Document
	q := r.db.Where("is_deleted = ?", false)
	if !admin {
		q = q.Where(
			`(owner_id = ? OR id IN (SELECT document_id FROM document_shares WHERE shared_with_id = ?))`,
			ownerID, ownerID,
		)
	}
	if fullText {
		tsQuery := strings.TrimSpace(query)
		if tsQuery != "" {
			q = q.Where(
				`to_tsvector('french', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(file_name,'') || ' ' || coalesce(ocr_text,''))
				@@ plainto_tsquery('french', ?)`,
				tsQuery,
			)
		}
	} else {
		pattern := "%" + query + "%"
		q = q.Where(
			`(title ILIKE ? OR description ILIKE ? OR file_name ILIKE ? OR category ILIKE ? OR ocr_text ILIKE ?
			OR id IN (
				SELECT dtl.document_id FROM document_tag_links dtl
				JOIN document_tags dt ON dt.id = dtl.tag_id
				WHERE dt.name ILIKE ?
			))`,
			pattern, pattern, pattern, pattern, pattern, pattern,
		)
	}
	if cursor != nil && cursor.ID > 0 {
		q = q.Where("(updated_at, id) < (?, ?)", cursor.CreatedAt, cursor.ID)
	}
	if limit <= 0 {
		limit = 50
	}
	err := q.Order("updated_at DESC, id DESC").Limit(limit + 1).Find(&rows).Error
	if err != nil {
		return nil, nil, err
	}
	var nextCursor *Cursor
	if len(rows) > limit {
		rows = rows[:limit]
		last := rows[len(rows)-1]
		nextCursor = &Cursor{CreatedAt: last.UpdatedAt.UTC().Format(time.RFC3339Nano), ID: last.ID}
	}
	return rows, nextCursor, nil
}
