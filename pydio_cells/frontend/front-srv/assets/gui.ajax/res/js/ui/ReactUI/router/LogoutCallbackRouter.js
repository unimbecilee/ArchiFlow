/*
 * Copyright 2007-2017 Charles du Jeu - Abstrium SAS <team (at) pyd.io>
 * This file is part of Pydio.
 *
 * Pydio is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

import browserHistory from 'react-router/lib/browserHistory'

const PydioApi = require('pydio/http/api')

const LoginCallbackRouterWrapper = (pydio) => {
    return class extends React.PureComponent {
        render() {
            PydioApi.getRestClient().sessionLogoutCallback().then(() => {
                // Utiliser l'URL de redirection depuis la variable d'environnement
                const redirectUrl = window.CELLS_SESSION_EXPIRED_REDIRECT_URL || "/login";
                if (redirectUrl.startsWith("http://") || redirectUrl.startsWith("https://")) {
                    // URL externe : utiliser window.location.href
                    window.location.href = redirectUrl;
                } else {
                    // URL relative : utiliser browserHistory
                    browserHistory.replace(redirectUrl);
                }
            });

            return <div></div>
        }
    }
}

export default LoginCallbackRouterWrapper