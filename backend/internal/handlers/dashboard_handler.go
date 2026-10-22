package handlers

import (
	"net/http"
	"sync"
	"time"

	"archiflow/backend/internal/models"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

type dashboardCacheEntry struct {
	data      map[string]any
	expiresAt time.Time
}

type dashboardStatsCache struct {
	mu    sync.RWMutex
	ttl   time.Duration
	byKey map[string]dashboardCacheEntry
}

func newDashboardStatsCache() *dashboardStatsCache {
	return &dashboardStatsCache{
		ttl:   30 * time.Second,
		byKey: make(map[string]dashboardCacheEntry),
	}
}

func (c *dashboardStatsCache) get(key string) (map[string]any, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.byKey[key]
	if !ok || time.Now().After(e.expiresAt) {
		return nil, false
	}
	return e.data, true
}

func (c *dashboardStatsCache) set(key string, data map[string]any) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.byKey[key] = dashboardCacheEntry{data: data, expiresAt: time.Now().Add(c.ttl)}
}

type DashboardHandler struct {
	docRepo  *repository.DocumentRepository
	collab   *repository.CollaborationRepository
	favRepo  *repository.FavoriteRepository
	workflow *services.WorkflowService
	cache    *dashboardStatsCache
}

func NewDashboardHandler(
	docRepo *repository.DocumentRepository,
	collab *repository.CollaborationRepository,
	favRepo *repository.FavoriteRepository,
	workflow *services.WorkflowService,
) *DashboardHandler {
	return &DashboardHandler{
		docRepo:  docRepo,
		collab:   collab,
		favRepo:  favRepo,
		workflow: workflow,
		cache:    newDashboardStatsCache(),
	}
}

// Stats GET /api/dashboard/stats
func (h *DashboardHandler) Stats(c echo.Context) error {
	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}
	role, _ := c.Get("role").(string)
	cacheKey := role + ":" + itoa(userID)
	if cached, ok := h.cache.get(cacheKey); ok {
		return c.JSON(http.StatusOK, map[string]any{"success": true, "data": cached})
	}
	isAdmin := models.RoleIsAdmin(role)

	docCount, _ := h.docRepo.CountActive(userID, isAdmin)
	trashCount, _ := h.docRepo.CountTrash(userID, isAdmin)

	pendingCount, _ := h.workflow.PendingApprovalsCount(userID, role)
	inProgressCount, _ := h.workflow.MyInProgressCount(userID)

	sharedCount, _ := h.collab.CountSharesForUser(userID)
	unread, _ := h.collab.CountUnread(userID)
	favorites, _ := h.favRepo.Count(userID)

	data := map[string]any{
		"documents":             docCount,
		"trash":                 trashCount,
		"favorites":             favorites,
		"workflows_pending":     pendingCount,
		"workflows_in_progress": inProgressCount,
		"documents_shared":      sharedCount,
		"notifications_unread":  unread,
	}
	h.cache.set(cacheKey, data)

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"data":    data,
	})
}

func itoa(id uint) string {
	if id == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for id > 0 {
		i--
		b[i] = byte('0' + id%10)
		id /= 10
	}
	return string(b[i:])
}
