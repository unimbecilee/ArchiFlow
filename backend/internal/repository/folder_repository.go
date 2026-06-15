package repository

import (
	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type FolderRepository struct {
	db *gorm.DB
}

func NewFolderRepository(db *gorm.DB) *FolderRepository {
	return &FolderRepository{db: db}
}

func (r *FolderRepository) Create(f *models.Folder) error {
	return r.db.Create(f).Error
}

func (r *FolderRepository) FindByID(id uint) (*models.Folder, error) {
	var f models.Folder
	if err := r.db.First(&f, id).Error; err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *FolderRepository) ListByOwner(ownerID uint, parentID *uint, admin bool) ([]models.Folder, error) {
	var rows []models.Folder
	q := r.db.Model(&models.Folder{})
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	if parentID == nil {
		q = q.Where("parent_id IS NULL")
	} else {
		q = q.Where("parent_id = ?", *parentID)
	}
	return rows, q.Order("name ASC").Find(&rows).Error
}

func (r *FolderRepository) Update(f *models.Folder) error {
	return r.db.Save(f).Error
}

func (r *FolderRepository) Delete(id uint, ownerID uint, admin bool) error {
	q := r.db.Where("id = ?", id)
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	return q.Delete(&models.Folder{}).Error
}

func (r *FolderRepository) ListAllByOwner(ownerID uint, admin bool) ([]models.Folder, error) {
	var rows []models.Folder
	q := r.db.Model(&models.Folder{})
	if !admin {
		q = q.Where("owner_id = ?", ownerID)
	}
	err := q.Order("name ASC").Find(&rows).Error
	return rows, err
}

func (r *FolderRepository) CountChildren(folderID uint) (subfolders int64, documents int64, err error) {
	err = r.db.Model(&models.Folder{}).Where("parent_id = ?", folderID).Count(&subfolders).Error
	if err != nil {
		return
	}
	err = r.db.Model(&models.Document{}).Where("folder_id = ? AND is_deleted = ?", folderID, false).Count(&documents).Error
	return
}
