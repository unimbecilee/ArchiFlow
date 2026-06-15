package handlers

import (
	"net/http"

	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type DashboardHandler struct {
	docRepo  *repository.DocumentRepository
	collab   *repository.CollaborationRepository
	favRepo  *repository.FavoriteRepository
	workflow *services.WorkflowService
}

func NewDashboardHandler(
	docRepo *repository.DocumentRepository,
	collab *repository.CollaborationRepository,
	favRepo *repository.FavoriteRepository,
	workflow *services.WorkflowService,
) *DashboardHandler {
	return &DashboardHandler{docRepo: docRepo, collab: collab, favRepo: favRepo, workflow: workflow}
}

// Stats GET /api/dashboard/stats
func (h *DashboardHandler) Stats(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	role, _ := c.Get("role").(string)
	isAdmin := role == "admin"

	docCount, _ := h.docRepo.CountActive(userID, isAdmin)
	trashCount, _ := h.docRepo.CountTrash(userID, isAdmin)

	pendingCount, _ := h.workflow.PendingApprovalsCount(userID, role)
	inProgressCount, _ := h.workflow.MyInProgressCount(userID)

	shared, _ := h.collab.ListSharesForUser(userID)
	unread, _ := h.collab.CountUnread(userID)
	favorites, _ := h.favRepo.Count(userID)

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"documents":              docCount,
			"trash":                  trashCount,
			"favorites":              favorites,
			"workflows_pending":      pendingCount,
			"workflows_in_progress":  inProgressCount,
			"documents_shared":       len(shared),
			"notifications_unread": unread,
		},
	})
}
