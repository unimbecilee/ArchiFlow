package middleware

import (
	"os"
	"strings"

	"archiflow/backend/internal/config"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func CORS() echo.MiddlewareFunc {
	allowed := map[string]struct{}{
		"http://localhost:3000":  {},
		"http://127.0.0.1:3000":  {},
		"http://localhost:5173":  {},
		"http://127.0.0.1:5173":  {},
		"http://localhost:4001":  {}, // Pydio Cells — plugin archivage navigateur
		"http://127.0.0.1:4001":  {},
	}
	if u := strings.TrimSpace(os.Getenv("FRONTEND_URL")); u != "" {
		allowed[strings.TrimRight(u, "/")] = struct{}{}
	}
	if extra := os.Getenv("ARCHIFLOW_CORS_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				allowed[strings.TrimRight(o, "/")] = struct{}{}
			}
		}
	}

	return middleware.CORSWithConfig(middleware.CORSConfig{
		AllowCredentials: true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Pydio-Token", "X-Pydio-Signature"},
		AllowOriginFunc: func(origin string) (bool, error) {
			if origin == "" {
				// Prod: no Origin header — deny (blocks naive CSRF from <form> without Origin in some cases)
				return !config.IsProduction(), nil
			}
			origin = strings.TrimRight(origin, "/")
			if _, ok := allowed[origin]; ok {
				return true, nil
			}
			return false, nil
		},
	})
}
