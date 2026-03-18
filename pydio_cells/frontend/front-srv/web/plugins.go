/*
 * Copyright (c) 2018. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

// Package web is serving the main entry points for the JS frontend
package web

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/lpar/gzipped"
	"go.uber.org/zap"
	"google.golang.org/grpc"

	"github.com/pydio/cells/v4/common"
	"github.com/pydio/cells/v4/common/broker"
	"github.com/pydio/cells/v4/common/config"
	"github.com/pydio/cells/v4/common/log"
	"github.com/pydio/cells/v4/common/proto/front"
	"github.com/pydio/cells/v4/common/runtime"
	"github.com/pydio/cells/v4/common/server"
	"github.com/pydio/cells/v4/common/service"
	servicecontext "github.com/pydio/cells/v4/common/service/context"
	"github.com/pydio/cells/v4/common/service/frontend"
	"github.com/pydio/cells/v4/frontend/front-srv/web/index"
)

var (
	Name         = common.ServiceWebNamespace_ + common.ServiceFrontStatics
	RobotsString = `User-agent: *
Disallow: /`
	ResetPasswordPath = "/user/reset-password/"
)

func init() {

	runtime.Register("main", func(ctx context.Context) {
		service.NewService(
			service.Name(common.ServiceGrpcNamespace_+common.ServiceFrontStatics),
			service.Context(ctx),
			service.Tag(common.ServiceTagFrontend),
			service.Description("Grpc service for internal requests about frontend manifest"),
			service.WithGRPC(func(ctx context.Context, server grpc.ServiceRegistrar) error {
				mH := &index.ManifestHandler{HandlerName: common.ServiceGrpcNamespace_ + common.ServiceFrontStatics}
				front.RegisterManifestServiceServer(server, mH)
				return nil
			}),
		)
		service.NewService(
			service.Name(Name),
			service.Context(ctx),
			service.Tag(common.ServiceTagFrontend),
			service.Description("WEB service for serving statics"),
			service.Migrations([]*service.Migration{
				{
					TargetVersion: service.ValidVersion("1.2.0"),
					Up:            DropLegacyStatics,
				},
			}),
			service.WithHTTP(func(ctx context.Context, mux server.HttpMux) error {
				httpFs := http.FS(frontend.GetPluginsFS())

				fs := gzipped.FileServer(httpFs)
				timeoutWrap := func(handler http.Handler) http.Handler {
					return http.TimeoutHandler(handler, 15*time.Second, "There was a timeout while serving the frontend resources...")
				}
				fs = timeoutWrap(fs)

				mux.Handle("/index.json", fs)
				mux.Handle("/plug/", http.StripPrefix("/plug/", fs))
				indexHandler := index.NewIndexHandler(ctx, ResetPasswordPath)
				mux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(200)
					w.Header().Set("Content-Type", "text/plain")
					w.Write([]byte(RobotsString))
				})
				// Handler pour la page SSO de stockage des tokens
				mux.HandleFunc("/auth/sso-storage.html", func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Content-Type", "text/html; charset=utf-8")
					w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
					w.WriteHeader(200)
					w.Write([]byte(`<!DOCTYPE html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Redirection SSO - UniDoc</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #fff;
		}
		.container {
			text-align: center;
			padding: 2rem;
			animation: fadeIn 0.5s ease-in;
		}
		@keyframes fadeIn {
			from { opacity: 0; transform: translateY(-20px); }
			to { opacity: 1; transform: translateY(0); }
		}
		.logo {
			font-size: 3rem;
			margin-bottom: 1rem;
			animation: pulse 2s ease-in-out infinite;
		}
		@keyframes pulse {
			0%, 100% { transform: scale(1); }
			50% { transform: scale(1.05); }
		}
		h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
		p { font-size: 1rem; opacity: 0.9; margin-bottom: 2rem; }
		.spinner {
			width: 50px;
			height: 50px;
			margin: 0 auto;
			border: 4px solid rgba(255, 255, 255, 0.3);
			border-top-color: #fff;
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}
		@keyframes spin { to { transform: rotate(360deg); } }
		.progress-bar {
			width: 200px;
			height: 4px;
			background: rgba(255, 255, 255, 0.3);
			border-radius: 2px;
			margin: 2rem auto 0;
			overflow: hidden;
		}
		.progress-fill {
			height: 100%;
			background: #fff;
			width: 0%;
			animation: progress 1.5s ease-out forwards;
		}
		@keyframes progress { to { width: 100%; } }
	</style>
</head>
<body>
	<div class="container">
		<div class="logo">🔐</div>
		<h1>Connexion en cours...</h1>
		<p>Redirection vers Collaboration</p>
		<div class="spinner"></div>
		<div class="progress-bar"><div class="progress-fill"></div></div>
	</div>
	<script>
		console.log("=== Pydio Cells SSO Token Storage ===");
		function extractTokenData() {
			var urlParams = new URLSearchParams(window.location.search);
			var tokenDataEncoded = urlParams.get('token');
			if (!tokenDataEncoded) {
				var hash = window.location.hash;
				if (hash) {
					hash = hash.substring(1);
					var match = hash.match(/sso_token=([^&]*)/);
					if (match && match[1]) {
						tokenDataEncoded = decodeURIComponent(match[1]);
					}
				}
			}
			return tokenDataEncoded;
		}
		var tokenDataEncoded = extractTokenData();
		if (tokenDataEncoded) {
			try {
				var tokenDataJson = atob(tokenDataEncoded);
				var tokenData = JSON.parse(tokenDataJson);
				console.log("Tokens reçus, stockage dans le Local Storage...");
				localStorage.setItem("token4", JSON.stringify(tokenData));
				console.log("Tokens stockés avec succès");
				setTimeout(function() {
					window.location.replace(window.location.origin + '/');
				}, 500);
			} catch (e) {
				console.error("Erreur:", e);
				document.querySelector('h1').textContent = 'Erreur de connexion';
				document.querySelector('p').textContent = 'Redirection vers la page de connexion...';
				setTimeout(function() {
					window.location.replace(window.location.origin + '/');
				}, 2000);
			}
		} else {
			console.warn("Aucun token trouvé");
			window.location.replace(window.location.origin + '/');
		}
	</script>
</body>
</html>`))
				})
				mux.Handle("/", indexHandler)
				mux.Handle(ResetPasswordPath, indexHandler)

				// /public endpoint : special handler for index, redirect to /plug/ for the rest
				ph := index.NewPublicHandler(ctx)
				handler := servicecontext.HttpWrapperMeta(ctx, ph)
				//handler = http.StripPrefix(config.GetPublicBaseUri()+"/", handler)
				handler = timeoutWrap(handler)
				mux.Handle(config.GetPublicBaseUri()+"/", handler)
				mux.Handle(config.GetPublicBaseUri()+"/plug/", http.StripPrefix(config.GetPublicBaseUri()+"/plug/", fs))

				// Adding subscriber
				_ = broker.SubscribeCancellable(ctx, common.TopicReloadAssets, func(message broker.Message) error {
					log.Logger(ctx).Info("Reloading frontend plugins from file system")
					frontend.HotReload()
					httpFs = http.FS(frontend.GetPluginsFS())
					return nil
				}, broker.WithCounterName("frontend"))

				return nil
			}),
			service.WithHTTPStop(func(ctx context.Context, mux server.HttpMux) error {
				if m, ok := mux.(server.PatternsProvider); ok {
					m.DeregisterPattern("/index.json")
					m.DeregisterPattern("/plug/")
					m.DeregisterPattern("/robots.txt")
					m.DeregisterPattern("/auth/sso-storage.html")
					m.DeregisterPattern("/")
					m.DeregisterPattern("/user/reset-password/")
					m.DeregisterPattern(config.GetPublicBaseUri() + "/")
					m.DeregisterPattern(config.GetPublicBaseUri() + "/plug/")
				}
				return nil
			}),
		)
	})
}

// DropLegacyStatics removes files and references to old PHP data in configuration
func DropLegacyStatics(ctx context.Context) error {

	frontRoot := config.Get("defaults", "frontRoot").Default(filepath.Join(runtime.ApplicationWorkingDir(), "static", "pydio")).String()
	if frontRoot != "" {
		if er := os.RemoveAll(frontRoot); er != nil {
			log.Logger(ctx).Error("Could not remove old PHP data from "+frontRoot+". You may safely delete this folder. Error was", zap.Error(er))
		} else {
			log.Logger(ctx).Info("Successfully removed old PHP data from " + frontRoot)
		}
	}

	log.Logger(ctx).Info("Clearing unused configurations")
	config.Del("defaults", "frontRoot")
	config.Del("defaults", "fpm")
	config.Del("defaults", "fronts")
	config.Del("services", "pydio.frontends")
	config.Set("SGDS", "frontend", "plugin", "core.pydio", "APPLICATION_TITLE")
	if e := config.Save(common.PydioSystemUsername, "Upgrade to 1.2.0"); e == nil {
		log.Logger(ctx).Info("[Upgrade] Cleaned unused configurations")
	}

	return nil
}
