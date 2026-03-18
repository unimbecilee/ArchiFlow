/*
 * Copyright (c) 2024. Abstrium SAS <team (at) pyd.io>
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

class Callbacks {
    static openSupervisionConsole(manager, otherArguments) {
        // Récupérer l'URL depuis la variable globale injectée dans le template HTML
        const url = (typeof window !== 'undefined' && window.CELLS_EXTERNAL_URLS && window.CELLS_EXTERNAL_URLS.supervisionConsole) 
            ? window.CELLS_EXTERNAL_URLS.supervisionConsole 
            : null;
        
        if (url && url.trim() !== '') {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            alert('URL de la console de supervision non configurée.\nVeuillez définir CELLS_SUPERVISION_CONSOLE_URL dans le fichier .env et redémarrer le service.');
        }
    }
    
    static openCellsConsole(manager, otherArguments) {
        // Pour une future action "Cells Console"
        const url = (typeof window !== 'undefined' && window.CELLS_EXTERNAL_URLS && window.CELLS_EXTERNAL_URLS.cellsConsole) 
            ? window.CELLS_EXTERNAL_URLS.cellsConsole 
            : null;
        
        if (url && url.trim() !== '') {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            alert('URL de la console Cells non configurée.');
        }
    }
}

export {Callbacks};

