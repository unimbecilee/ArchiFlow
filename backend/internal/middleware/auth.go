package middleware

import (
	"net/http"
	"strings"

	"archiflow/backend/internal/dto"
	"archiflow/backend/internal/repository"
	"archiflow/backend/internal/services"
	"archiflow/backend/internal/utils"

	"github.com/labstack/echo/v4"
)

func JWTAuth(jwtUtil *utils.JWTUtil, sessions *services.SessionService) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
					Success: false,
					Message: "Authorization header required",
				})
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
					Success: false,
					Message: "Invalid authorization header format",
				})
			}

			claims, err := jwtUtil.ValidateAccessToken(parts[1])
			if err != nil {
				return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
					Success: false,
					Message: "Invalid or expired token",
				})
			}

			if err := sessions.ValidateTokenVersion(claims.UserID, claims.TokenVersion); err != nil {
				return c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
					Success: false,
					Message: "Session invalidated",
				})
			}

			c.Set("userID", claims.UserID)
			c.Set("email", claims.Email)
			c.Set("role", claims.Role)
			c.Set("sessionID", claims.SessionID)
			c.Set("tokenVersion", claims.TokenVersion)

			return next(c)
		}
	}
}

// MustChangePassword blocks API until initial password is set (except auth profile endpoints).
func MustChangePassword(users repository.UserRepository) echo.MiddlewareFunc {
	allowed := map[string]bool{
		"/api/auth/me":              true,
		"/api/auth/change-password": true,
		"/api/auth/logout":          true,
	}
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			path := c.Path()
			if allowed[path] {
				return next(c)
			}
			userID, ok := c.Get("userID").(uint)
			if !ok || userID == 0 {
				return next(c)
			}
			user, err := users.GetByID(userID)
			if err != nil || !user.MustChangePassword {
				return next(c)
			}
			return c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Success: false,
				Message: "password_change_required",
			})
		}
	}
}

func RequireAdmin() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			role, _ := c.Get("role").(string)
			if role != "admin" {
				return c.JSON(http.StatusForbidden, dto.ErrorResponse{
					Success: false,
					Message: "admin only",
				})
			}
			return next(c)
		}
	}
}

func RequireRole(role string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			userRole := c.Get("role").(string)
			if userRole != role && userRole != "admin" {
				return c.JSON(http.StatusForbidden, dto.ErrorResponse{
					Success: false,
					Message: "Insufficient permissions",
				})
			}
			return next(c)
		}
	}
}
