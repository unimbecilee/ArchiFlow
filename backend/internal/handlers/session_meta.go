package handlers

import (
	"archiflow/backend/internal/services"

	"github.com/labstack/echo/v4"
)

func sessionMeta(c echo.Context) services.SessionMeta {
	return services.SessionMeta{
		UserAgent: c.Request().UserAgent(),
		IPAddress: c.RealIP(),
	}
}
