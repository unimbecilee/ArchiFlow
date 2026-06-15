package repository

import (
	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type FavoriteRepository struct {
	db *gorm.DB
}

func NewFavoriteRepository(db *gorm.DB) *FavoriteRepository {
	return &FavoriteRepository{db: db}
}

func (r *FavoriteRepository) Add(userID, documentID uint) error {
	f := models.DocumentFavorite{UserID: userID, DocumentID: documentID}
	return r.db.Where("user_id = ? AND document_id = ?", userID, documentID).
		FirstOrCreate(&f).Error
}

func (r *FavoriteRepository) Remove(userID, documentID uint) error {
	return r.db.Where("user_id = ? AND document_id = ?", userID, documentID).
		Delete(&models.DocumentFavorite{}).Error
}

func (r *FavoriteRepository) Exists(userID, documentID uint) (bool, error) {
	var n int64
	err := r.db.Model(&models.DocumentFavorite{}).
		Where("user_id = ? AND document_id = ?", userID, documentID).Count(&n).Error
	return n > 0, err
}

func (r *FavoriteRepository) ListDocuments(userID uint, limit int) ([]models.Document, error) {
	var docs []models.Document
	if limit <= 0 {
		limit = 100
	}
	err := r.db.Joins(
		"JOIN document_favorites ON document_favorites.document_id = documents.id AND document_favorites.user_id = ?",
		userID,
	).Where("documents.is_deleted = ?", false).
		Order("document_favorites.created_at DESC").
		Limit(limit).
		Find(&docs).Error
	return docs, err
}

func (r *FavoriteRepository) Count(userID uint) (int64, error) {
	var n int64
	err := r.db.Model(&models.DocumentFavorite{}).Where("user_id = ?", userID).Count(&n).Error
	return n, err
}
