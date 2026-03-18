/**
 * Plugin Pydio Cells - Bouton d'archivage ArchiFlow
 * Ajoute un bouton "Archiver vers ArchiFlow" dans le menu contextuel des fichiers
 */

(function() {
    'use strict';

    const ARCHIFLOW_API_URL = window.ARCHIFLOW_API_URL || 'http://localhost:5000';
    const PYDIO_API_TOKEN = window.PYDIO_API_TOKEN || 'archiflow_pydio_api_token_2024';

    async function sendArchiveRequest(node) {
        const payload = {
            document_id: node.getMetadata().get('uuid') || node.getPath(),
            document_name: node.getLabel(),
            workspace: pydio.user.activeRepository,
            path: node.getPath(),
            user: pydio.user.id,
            user_email: pydio.user.getPreference('email') || '',
            metadata: {
                size: node.getMetadata().get('bytesize'),
                mime: node.getMetadata().get('mime'),
                modified: node.getMetadata().get('ajxp_modiftime')
            }
        };

        try {
            const response = await fetch(`${ARCHIFLOW_API_URL}/api/api/v1/pydio/archive-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Pydio-Token': PYDIO_API_TOKEN
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                pydio.UI.displayMessage('SUCCESS', `Demande d'archivage envoyée pour "${node.getLabel()}"`);
                return result;
            } else {
                throw new Error(result.message || 'Erreur lors de l\'envoi');
            }
        } catch (error) {
            pydio.UI.displayMessage('ERROR', `Erreur: ${error.message}`);
            throw error;
        }
    }

    function canArchive(node) {
        if (node.isLeaf() === false) return false;
        const meta = node.getMetadata();
        if (meta.get('node_readonly') === 'true') return false;
        return true;
    }

    const archiveAction = {
        options: {
            name: 'archiflow_archive',
            text: 'Archiver vers ArchiFlow',
            title: 'Envoyer ce document vers ArchiFlow',
            icon_class: 'mdi mdi-archive',
            callback: function(manager, args) {
                const selectedNodes = pydio.getContextHolder().getSelectedNodes();
                
                if (selectedNodes.length === 0) {
                    pydio.UI.displayMessage('ERROR', 'Veuillez sélectionner un fichier');
                    return;
                }

                if (window.confirm(`Archiver ${selectedNodes.length} fichier(s) vers ArchiFlow ?`)) {
                    selectedNodes.forEach(node => {
                        if (canArchive(node)) {
                            sendArchiveRequest(node);
                        }
                    });
                }
            },
            selectionContext: {
                dir: false,
                file: true,
                allowedMimes: ['*'],
                unique: false,
                multipleOnly: false
            }
        }
    };

    if (window.pydio && window.pydio.Controller) {
        window.pydio.Controller.registerAction(archiveAction);
        console.log('✅ Plugin ArchiFlow Archive Button chargé');
    } else {
        document.addEventListener('pydio:loaded', function() {
            if (window.pydio && window.pydio.Controller) {
                window.pydio.Controller.registerAction(archiveAction);
            }
        });
    }
})();
