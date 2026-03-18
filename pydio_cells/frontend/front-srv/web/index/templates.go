/*
 * Copyright (c) 2023. Abstrium SAS <team (at) pydio.com>
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

package index

import (
	"html/template"

	"github.com/pydio/cells/v4/common/utils/i18n"
)

// TplConfFilterFunc takes a TplConf and modifies it
type TplConfFilterFunc func(in *TplConf) *TplConf

var (
	tplConfFilters []TplConfFilterFunc
)

// RegisterTplConfFilter registers a filter for modifying main Template Conf
func RegisterTplConfFilter(f TplConfFilterFunc) {
	tplConfFilters = append(tplConfFilters, f)
}

// FilterTplConf applies registered filters on TplConf object
func FilterTplConf(i *TplConf) *TplConf {
	for _, f := range tplConfFilters {
		i = f(i)
	}
	return i
}

// TplConf is a data struct for main index page template
type TplConf struct {
	ApplicationTitle  string
	Favicon           string
	Rebase            string
	ResourcesFolder   string
	Theme             string
	Version           string
	ErrorMessage      string
	LoadingString     string
	CustomHTMLHeader  template.HTML
	StartParameters           map[string]interface{}
	ExternalURLs              template.JS // URLs externes injectées depuis les variables d'environnement
	ArchiveApiBaseUrl         template.JS // URL de l'API Archive injectée depuis les variables d'environnement
	SessionExpiredRedirectUrl template.JS // URL de redirection en cas d'expiration de session
}

// GetLoadingString sends an i18n string for "Loading..."
func GetLoadingString(lang string) string {
	if s, o := i18n.LoadingStrings[lang]; o {
		return s
	} else {
		return i18n.LoadingStrings["en-us"]
	}
}

var Loader = `
 <div style="position: absolute;display:flex; flex-direction:column ;top: 0;bottom: 0;left: 0;right: 0;align-items: center;justify-content: center; font-family: Roboto, sans-serif;background-color:#424242; color: white">
	 <div style="font-size:12px; margin-top: 10px;">{{.LoadingString}}</div>
 </div>
 `

var loading = `<!DOCTYPE html>
 <html xmlns:ajxp>
	 <head>
		 <title>{{.ApplicationTitle}}</title>
 {{if .CustomHTMLHeader}}{{.CustomHTMLHeader}}{{end}}
		 {{if .Rebase}}<base href="{{.Rebase}}"/>{{end}}
		 <link rel="stylesheet" type="text/css" href="{{.ResourcesFolder}}/dist/pydio.{{.Theme}}.min.css?v={{.Version}}">
		 <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		 <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
	 </head>
	 <body style="position: absolute;display:flex;top: 0;bottom: 0;left: 0;right: 0;align-items: center;justify-content: center; background-color:#424242;" class="react-mui-context">
		 <script type="text/javascript">
			 window.setTimeout(function(){window.location.reload();}, 4000);
		 </script>
		 <div style="color: white">Please wait while {{.ApplicationTitle}} server is starting...</div>
	 </body>
 </html>
 `

var Page = `<!DOCTYPE html>
 <html xmlns:ajxp>
	 <head>
		 <title>{{.ApplicationTitle}}</title>
 {{if .CustomHTMLHeader}}{{.CustomHTMLHeader}}{{end}}
		 {{if .Rebase}}<base href="{{.Rebase}}"/>{{end}}
		 <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		 <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
		 <script language="javascript" type="text/javascript" src="{{.ResourcesFolder}}/dist/boot/pydio.boot.min.js?v={{.Version}}"></script>
		 <link rel="icon" type="image/x-png" href="{{.Favicon}}">
	 </head>
	 <body style="overflow: hidden;background-color: #424242;" class="react-mui-context">
		 <script type="text/javascript">
			 // Gestion du token SSO depuis le fragment URL (#sso_token=...)
			 // Ceci est une solution de secours si la page /auth/sso-storage.html n'existe pas encore
			 (function() {
				 var hash = window.location.hash;
				 if (hash) {
					 var match = hash.match(/sso_token=([^&]*)/);
					 if (match && match[1]) {
						 try {
							 var tokenDataEncoded = decodeURIComponent(match[1]);
							 var tokenDataJson = atob(tokenDataEncoded);
							 var tokenData = JSON.parse(tokenDataJson);
							 
							 console.log("=== Pydio Cells SSO Token Storage (from fragment) ===");
							 console.log("Token data détecté dans le fragment URL, stockage dans le Local Storage...");
							 
							 // Stocker dans le Local Storage avec la clé "token4" (comme Pydio Cells le fait)
							 localStorage.setItem("token4", JSON.stringify(tokenData));
							 
							 console.log("Tokens stockés avec succès dans le Local Storage");
							 
							 // Nettoyer le fragment de l'URL pour éviter de le laisser dans l'historique
							 if (window.history && window.history.replaceState) {
								 window.history.replaceState(null, null, window.location.pathname + window.location.search);
							 }
						 } catch (e) {
							 console.error("Erreur lors du décodage/stockage des tokens depuis le fragment:", e);
						 }
					 }
				 }
			 })();
			 
			 var pydio, startParameters = {}, MessageHash={};
			 // Injecter les URLs externes depuis les variables d'environnement
			 window.CELLS_EXTERNAL_URLS = {{.ExternalURLs}};
			 // Injecter l'URL de l'API Archive
			 window.CELLS_ARCHIVE_API_BASE_URL = {{.ArchiveApiBaseUrl}};
			 // Injecter l'URL de redirection en cas d'expiration de session
			 window.CELLS_SESSION_EXPIRED_REDIRECT_URL = {{.SessionExpiredRedirectUrl}};
			 startParameters = {{.StartParameters}};
			 window.pydioBootstrap = new PydioBootstrap(startParameters);
		 </script>
		 <div id="{{.StartParameters.MAIN_ELEMENT}}">` + Loader + `</div>
	 </body>
 </html>
 `

var Public = `<!DOCTYPE html>
 <html xmlns:ajxp>
	 <head>
		 <title>{{.ApplicationTitle}}</title>
 {{if .CustomHTMLHeader}}{{.CustomHTMLHeader}}{{end}}
		 {{if .Rebase}}<base href="{{.Rebase}}"/>{{end}}
		 <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		 <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
		 <script language="javascript" type="text/javascript" src="{{.ResourcesFolder}}/dist/boot/pydio.boot.min.js?v={{.Version}}"></script>
		 <link rel="icon" type="image/x-png" href="{{.Favicon}}">
	 </head>
	 <body style="overflow: hidden;background-color: #424242;" class="react-mui-context">
		 <script type="text/javascript">
			 var pydio, startParameters = {}, MessageHash={};
			 // Injecter les URLs externes depuis les variables d'environnement
			 window.CELLS_EXTERNAL_URLS = {{.ExternalURLs}};
			 // Injecter l'URL de l'API Archive
			 window.CELLS_ARCHIVE_API_BASE_URL = {{.ArchiveApiBaseUrl}};
			 // Injecter l'URL de redirection en cas d'expiration de session
			 window.CELLS_SESSION_EXPIRED_REDIRECT_URL = {{.SessionExpiredRedirectUrl}};
			 startParameters = {{.StartParameters}};
			 window.pydioBootstrap = new PydioBootstrap(startParameters);
		 </script>
		 <div class="vertical_fit vertical_layout" id="{{.StartParameters.MAIN_ELEMENT}}">` + Loader + `</div>
	 </body>
 </html>
 `

var errorTpl = `<!DOCTYPE html>
 <html xmlns:ajxp>
	 <head>
		 <title>{{.ApplicationTitle}}</title>
 {{if .CustomHTMLHeader}}{{.CustomHTMLHeader}}{{end}}
		 {{if .Rebase}}<base href="{{.Rebase}}"/>{{end}}
		 <link rel="stylesheet" type="text/css" href="{{.ResourcesFolder}}/dist/pydio.{{.Theme}}.min.css?v={{.Version}}">
		 <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		 <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
		 <link rel="icon" type="image/x-png" href="{{.Favicon}}">
	 </head>
	 <body style="position: absolute;display:flex;top: 0;bottom: 0;left: 0;right: 0;align-items: center;justify-content: center;" class="react-mui-context">
		 <div>{{.ErrorMessage}}</div>
	 </body>
 </html>
 `
