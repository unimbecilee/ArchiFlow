package handlers

import (
	"archiflow/backend/internal/middleware"
	"archiflow/backend/internal/models"
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

func newAuditEvent(c echo.Context, action, resourceType, resourceID string) models.AuditEvent {
	ev := models.AuditEvent{
		Source:        "api",
		Action:        action,
		ResourceType:  resourceType,
		ResourceID:    resourceID,
		IP:            c.RealIP(),
		CorrelationID: middleware.GetRequestID(c),
		ActorEmail:    emailOrEmpty(c),
	}
	if uid, err := userIDFromContext(c); err == nil && uid > 0 {
		ev.ActorID = &uid
	}
	return ev
}

func emailOrEmpty(c echo.Context) string {
	v, _ := c.Get("email").(string)
	return v
}

func logAudit(svc *services.AuditService, ev models.AuditEvent) {
	if svc == nil {
		return
	}
	_ = svc.Log(ev)
}

func logAuditWithActor(svc *services.AuditService, ev models.AuditEvent, actorID uint, actorEmail string) {
	if svc == nil {
		return
	}
	if actorID > 0 {
		ev.ActorID = &actorID
	}
	ev.ActorEmail = actorEmail
	_ = svc.Log(ev)
}