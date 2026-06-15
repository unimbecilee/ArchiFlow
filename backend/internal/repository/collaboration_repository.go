package repository

import (
	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type CollaborationRepository struct {
	db *gorm.DB
}

func NewCollaborationRepository(db *gorm.DB) *CollaborationRepository {
	return &CollaborationRepository{db: db}
}

func (r *CollaborationRepository) CreateShare(s *models.DocumentShare) error {
	return r.db.Create(s).Error
}

func (r *CollaborationRepository) FindShare(documentID, sharedWithID uint) (*models.DocumentShare, error) {
	var s models.DocumentShare
	err := r.db.Where("document_id = ? AND shared_with_id = ? AND active = ?", documentID, sharedWithID, true).
		First(&s).Error
	return &s, err
}

func (r *CollaborationRepository) ListSharesForUser(userID uint) ([]models.DocumentShare, error) {
	var rows []models.DocumentShare
	err := r.db.Where("shared_with_id = ? AND active = ?", userID, true).
		Preload("SharedWith").Find(&rows).Error
	return rows, err
}

func (r *CollaborationRepository) ListSharesForDocument(documentID uint) ([]models.DocumentShare, error) {
	var rows []models.DocumentShare
	err := r.db.Where("document_id = ? AND active = ?", documentID, true).
		Preload("SharedWith").Find(&rows).Error
	return rows, err
}

func (r *CollaborationRepository) ListComments(documentID uint) ([]models.DocumentComment, error) {
	var rows []models.DocumentComment
	err := r.db.Where("document_id = ?", documentID).Preload("Author").
		Order("created_at ASC").Find(&rows).Error
	return rows, err
}

func (r *CollaborationRepository) CreateComment(c *models.DocumentComment) error {
	return r.db.Create(c).Error
}

func (r *CollaborationRepository) GetComment(id uint) (*models.DocumentComment, error) {
	var c models.DocumentComment
	err := r.db.Preload("Author").First(&c, id).Error
	return &c, err
}

func (r *CollaborationRepository) DeleteComment(id uint) error {
	return r.db.Delete(&models.DocumentComment{}, id).Error
}

func (r *CollaborationRepository) ListVersions(documentID uint) ([]models.DocumentVersion, error) {
	var rows []models.DocumentVersion
	err := r.db.Where("document_id = ?", documentID).Order("version_number DESC").Find(&rows).Error
	return rows, err
}

func (r *CollaborationRepository) MaxVersionNumber(documentID uint) (int, error) {
	var v models.DocumentVersion
	err := r.db.Where("document_id = ?", documentID).Order("version_number DESC").First(&v).Error
	if err == gorm.ErrRecordNotFound {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return v.VersionNumber, nil
}

func (r *CollaborationRepository) CreateVersion(v *models.DocumentVersion) error {
	return r.db.Create(v).Error
}

func (r *CollaborationRepository) GetVersion(id uint) (*models.DocumentVersion, error) {
	var v models.DocumentVersion
	err := r.db.First(&v, id).Error
	return &v, err
}

func (r *CollaborationRepository) ListTags() ([]models.Tag, error) {
	var rows []models.Tag
	return rows, r.db.Order("name ASC").Find(&rows).Error
}

func (r *CollaborationRepository) FindOrCreateTag(name, color string) (*models.Tag, error) {
	var t models.Tag
	err := r.db.Where("name = ?", name).First(&t).Error
	if err == nil {
		return &t, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}
	t = models.Tag{Name: name, Color: color}
	if err := r.db.Create(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *CollaborationRepository) LinkTag(documentID, tagID uint) error {
	link := models.DocumentTagLink{DocumentID: documentID, TagID: tagID}
	return r.db.FirstOrCreate(&link, link).Error
}

func (r *CollaborationRepository) UnlinkTag(documentID, tagID uint) error {
	return r.db.Where("document_id = ? AND tag_id = ?", documentID, tagID).
		Delete(&models.DocumentTagLink{}).Error
}

func (r *CollaborationRepository) ListDocumentTags(documentID uint) ([]models.Tag, error) {
	var tags []models.Tag
	err := r.db.Joins("JOIN document_tag_links ON document_tag_links.tag_id = document_tags.id").
		Where("document_tag_links.document_id = ?", documentID).Find(&tags).Error
	return tags, err
}

func (r *CollaborationRepository) CreateNotification(n *models.Notification) error {
	return r.db.Create(n).Error
}

func (r *CollaborationRepository) ListNotifications(userID uint, limit int) ([]models.Notification, error) {
	var rows []models.Notification
	q := r.db.Where("user_id = ?", userID).Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	return rows, q.Find(&rows).Error
}

func (r *CollaborationRepository) MarkNotificationRead(id, userID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).Update("is_read", true).Error
}

func (r *CollaborationRepository) MarkAllNotificationsRead(userID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("user_id = ?", userID).Update("is_read", true).Error
}

func (r *CollaborationRepository) CountUnread(userID uint) (int64, error) {
	var n int64
	err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).Count(&n).Error
	return n, err
}

func (r *CollaborationRepository) CountUnreadByType(userID uint, typ string) (int64, error) {
	var n int64
	err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ? AND type = ?", userID, false, typ).Count(&n).Error
	return n, err
}

func (r *CollaborationRepository) ListNotificationsSince(userID uint, sinceID uint, limit int) ([]models.Notification, error) {
	var rows []models.Notification
	q := r.db.Where("user_id = ?", userID).Order("id DESC")
	if sinceID > 0 {
		q = q.Where("id > ?", sinceID)
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	return rows, q.Find(&rows).Error
}
