package services

import (
	"errors"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
)

type FavoriteService struct {
	fav     *repository.FavoriteRepository
	docRepo *repository.DocumentRepository
	collab  *CollaborationService
}

func NewFavoriteService(
	fav *repository.FavoriteRepository,
	docRepo *repository.DocumentRepository,
	collab *CollaborationService,
) *FavoriteService {
	return &FavoriteService{fav: fav, docRepo: docRepo, collab: collab}
}

func (s *FavoriteService) canAccess(docID, userID uint, role string) error {
	if role == models.RoleAdmin || role == models.RoleArchivist {
		return nil
	}
	doc, err := s.docRepo.FindByID(docID)
	if err != nil {
		return errors.New("document not found")
	}
	if doc.OwnerID == userID {
		return nil
	}
	if s.collab != nil {
		ok, _, _ := s.collab.CanAccess(docID, userID, role)
		if ok {
			return nil
		}
	}
	return errors.New("forbidden")
}

func (s *FavoriteService) Add(userID, documentID uint, role string) error {
	if err := s.canAccess(documentID, userID, role); err != nil {
		return err
	}
	return s.fav.Add(userID, documentID)
}

func (s *FavoriteService) Remove(userID, documentID uint) error {
	return s.fav.Remove(userID, documentID)
}

func (s *FavoriteService) List(userID uint) ([]models.Document, error) {
	return s.fav.ListDocuments(userID, 100)
}

func (s *FavoriteService) IsFavorite(userID, documentID uint) (bool, error) {
	return s.fav.Exists(userID, documentID)
}
