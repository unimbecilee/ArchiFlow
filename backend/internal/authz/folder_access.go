package authz

import (
	"errors"
	"fmt"

	"archiflow/backend/internal/repository"
)

var ErrFolderForbidden = errors.New("forbidden")

// FolderAccess checks folder ownership (mes-documents scope). orgWide mirrors folder list org_scope.
type FolderAccess struct {
	folders *repository.FolderRepository
}

func NewFolderAccess(folders *repository.FolderRepository) *FolderAccess {
	return &FolderAccess{folders: folders}
}

// CanAccess returns nil if user may use the folder (create child, upload, list as owner).
func (f *FolderAccess) CanAccess(folderID uint, userID uint, orgWide bool) error {
	if folderID == 0 {
		return fmt.Errorf("invalid folder")
	}
	folder, err := f.folders.FindByID(folderID)
	if err != nil {
		return fmt.Errorf("folder not found")
	}
	if orgWide {
		return nil
	}
	if folder.OwnerID != userID {
		return ErrFolderForbidden
	}
	return nil
}

// CanAccessLegacy adapts admin bool from older call sites (admin without org scope = owner only).
func (f *FolderAccess) CanAccessLegacy(folderID uint, userID uint, isAdmin bool, orgWide bool) error {
	if isAdmin && orgWide {
		return f.CanAccess(folderID, userID, true)
	}
	return f.CanAccess(folderID, userID, false)
}
