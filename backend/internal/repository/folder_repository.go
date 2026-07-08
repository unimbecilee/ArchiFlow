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

func (r *FolderRepository) BatchCountChildren(folderIDs []uint, ownerID uint, admin bool) (subfolders map[uint]int64, documents map[uint]int64, err error) {
	subfolders = make(map[uint]int64, len(folderIDs))
	documents = make(map[uint]int64, len(folderIDs))
	if len(folderIDs) == 0 {
		return subfolders, documents, nil
	}
	type countRow struct {
		ParentID uint
		Cnt      int64
	}
	var sfRows []countRow
	sfQ := r.db.Model(&models.Folder{}).
		Select("parent_id as parent_id, count(*) as cnt").
		Where("parent_id IN ?", folderIDs)
	if !admin {
		sfQ = sfQ.Where("owner_id = ?", ownerID)
	}
	if err = sfQ.Group("parent_id").Scan(&sfRows).Error; err != nil {
		return nil, nil, err
	}
	for _, row := range sfRows {
		subfolders[row.ParentID] = row.Cnt
	}
	// Docs comptés seulement si owner_id = owner du dossier (évite docs orphelins d'autres users).
	var docRows []countRow
	if err = r.db.Model(&models.Document{}).
		Select("documents.folder_id as parent_id, count(*) as cnt").
		Joins("INNER JOIN folders ON folders.id = documents.folder_id").
		Where("documents.folder_id IN ? AND documents.is_deleted = ? AND documents.owner_id = folders.owner_id", folderIDs, false).
		Group("documents.folder_id").
		Scan(&docRows).Error; err != nil {
		return nil, nil, err
	}
	for _, row := range docRows {
		documents[row.ParentID] = row.Cnt
	}
	return subfolders, documents, nil
}

func (r *FolderRepository) CountChildren(folderID uint, ownerID uint, admin bool) (subfolders int64, documents int64, err error) {
	sfQ := r.db.Model(&models.Folder{}).Where("parent_id = ?", folderID)
	if !admin {
		sfQ = sfQ.Where("owner_id = ?", ownerID)
	}
	err = sfQ.Count(&subfolders).Error
	if err != nil {
		return
	}
	folder, ferr := r.FindByID(folderID)
	if ferr != nil {
		err = ferr
		return
	}
	err = r.db.Model(&models.Document{}).
		Where("folder_id = ? AND is_deleted = ? AND owner_id = ?", folderID, false, folder.OwnerID).
		Count(&documents).Error
	return
}
