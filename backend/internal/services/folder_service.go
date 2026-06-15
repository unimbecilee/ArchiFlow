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
	repo *repository.FolderRepository
}

func NewFolderService(repo *repository.FolderRepository) *FolderService {
	return &FolderService{repo: repo}
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
	for _, f := range rows {
		sf, doc, _ := s.repo.CountChildren(f.ID)
		out = append(out, FolderWithCounts{
			Folder:          f,
			SubfoldersCount: sf,
			DocumentsCount:  doc,
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

func (s *FolderService) Create(in CreateFolderInput) (*models.Folder, error) {
	if in.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if in.ParentID != nil {
		parent, err := s.repo.FindByID(*in.ParentID)
		if err != nil {
			return nil, fmt.Errorf("parent folder not found")
		}
		if parent.OwnerID != in.OwnerID {
			return nil, fmt.Errorf("forbidden parent folder")
		}
	}
	f := &models.Folder{
		Name:        in.Name,
		Description: in.Description,
		OwnerID:     in.OwnerID,
		ParentID:    in.ParentID,
	}
	if err := s.repo.Create(f); err != nil {
		return nil, err
	}
	return f, nil
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
		f.Name = name
	}
	f.Description = description
	if err := s.repo.Update(f); err != nil {
		return nil, err
	}
	return f, nil
}

func (s *FolderService) Delete(id, ownerID uint, isAdmin bool) error {
	f, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if !isAdmin && f.OwnerID != ownerID {
		return errors.New("forbidden")
	}
	sf, doc, _ := s.repo.CountChildren(id)
	if sf > 0 || doc > 0 {
		return fmt.Errorf("folder not empty")
	}
	return s.repo.Delete(id, ownerID, isAdmin)
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
