/*
 * ArchiveRequestAction - injects a context menu item to submit archive requests
 */
import React, {useEffect, useState} from 'react';
import ArchiveRequestDialog from './ArchiveRequestDialog.jsx';
import ArchiveRequestHistoryDialog from './ArchiveRequestHistoryDialog.jsx';
import Action from 'pydio/model/action';
import PydioApi from 'pydio/http/api';
import PathUtils from 'pydio/util/path';

// Get API endpoint from environment variable (injected at runtime via Go template or build time via webpack)
const getEndpoint = () => {
  // 1. Vérifier window.CELLS_ARCHIVE_API_BASE_URL (injecté au runtime via Go template) - PRIORITAIRE
  if (typeof window !== 'undefined' && window.CELLS_ARCHIVE_API_BASE_URL) {
    return window.CELLS_ARCHIVE_API_BASE_URL;
  }
  
  // 2. Vérifier variable d'environnement (injectée au build via webpack) - fallback
  if (typeof process !== 'undefined' && process.env && process.env.CELLS_ARCHIVE_API_BASE_URL) {
    return process.env.CELLS_ARCHIVE_API_BASE_URL;
  }
  
  // 3. Valeur par défaut
  return '';
};

// Helper function to get user UUID
const getUserUuid = async (pydio) => {
  if (!pydio || !pydio.user) return null;
  
  try {
    // Try to get UUID from cached idmUser first
    if (pydio.user.idmUser && pydio.user.idmUser.Uuid) {
      return pydio.user.idmUser.Uuid;
    }
    
    // If not cached, fetch it asynchronously
    if (pydio.user.getIdmUser) {
      const idmUser = await pydio.user.getIdmUser();
      if (idmUser && idmUser.Uuid) {
        return idmUser.Uuid;
      }
    }
  } catch(e) {
    console.warn('[ArchiveRequest] Could not get user UUID', e);
  }
  
  return null;
};

export default function ArchiveRequestAction({pydio}){
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({current: 0, total: 0});
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Download a file from Pydio and convert to Blob
  const downloadFileAsBlob = async (node) => {
    const client = PydioApi.getClient();
    const url = await client.buildPresignedGetUrl(node);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    return await response.blob();
  };

  // Send archive request to API with retry logic
  const sendArchiveRequest = async (fileBlob, fileName, userInfo, workspaceInfo, comment, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 secondes
    
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('nom', fileName);
    if (userInfo.uuid) formData.append('user_uuid', userInfo.uuid);
    if (userInfo.login) formData.append('user_login', userInfo.login);
    if (workspaceInfo.uuid) formData.append('workspace_uuid', workspaceInfo.uuid);
    if (comment) formData.append('comment', comment);
    formData.append('status', 'pending');

    const endpoint = getEndpoint();
    const apiUrl = `${endpoint}/api/v1/archives-requests`;
    
    console.log('[ArchiveRequest] Sending to:', apiUrl, `(attempt ${retryCount + 1}/${MAX_RETRIES})`);
    
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
    } catch(networkError) {
      // Network error (CORS, connection refused, etc.)
      const errorMsg = networkError.message || String(networkError);
      console.error('[ArchiveRequest] Network error:', networkError);
      
      // Retry logic for network errors
      if (retryCount < MAX_RETRIES - 1 && (
        errorMsg.includes('Failed to fetch') || 
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('Network request failed')
      )) {
        console.log(`[ArchiveRequest] Retry ${retryCount + 1}/${MAX_RETRIES} in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return sendArchiveRequest(fileBlob, fileName, userInfo, workspaceInfo, comment, retryCount + 1);
      }
      
      throw new Error(`Erreur réseau: ${errorMsg}. Vérifiez que l'API est accessible et que CORS est configuré.`);
    }
    
    if (!response.ok) {
      let errorText = '';
      let errorObj = null;
      try {
        const text = await response.text();
        try {
          errorObj = JSON.parse(text);
          if (errorObj && errorObj.error) {
            errorText = errorObj.error;
          } else {
            errorText = text;
          }
        } catch(e) {
          errorText = text;
        }
        
        // Détecter si c'est une page HTML d'erreur (ngrok offline, etc.)
        if (errorText.trim().startsWith('<!DOCTYPE') || errorText.includes('ngrok') || errorText.includes('ERR_NGROK')) {
          if (errorText.includes('ERR_NGROK_3200') || errorText.includes('offline')) {
            errorText = "L'API externe est actuellement hors ligne. Vérifiez que le service est actif.";
          } else {
            errorText = "L'API externe n'est pas accessible. Vérifiez l'URL de l'API.";
          }
        }
        
        // Retry logic for HTTP errors (5xx server errors)
        if (retryCount < MAX_RETRIES - 1 && response.status >= 500) {
          console.log(`[ArchiveRequest] Server error ${response.status}, retry ${retryCount + 1}/${MAX_RETRIES} in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return sendArchiveRequest(fileBlob, fileName, userInfo, workspaceInfo, comment, retryCount + 1);
        }
      } catch(e) {
        errorText = `HTTP ${response.status}`;
      }
      console.error('[ArchiveRequest] API error response:', response.status, errorText.substring(0, 200));
      throw new Error(`Erreur API: ${response.status} - ${errorText.substring(0, 200)}`);
    }
    
    try {
      return await response.json();
    } catch(e) {
      console.log('[ArchiveRequest] Non-JSON response, assuming success');
      return { success: true };
    }
  };

  // Load history from API with cache
  const loadHistory = async () => {
    const CACHE_KEY = 'archive-requests-cache';
    const CACHE_TIMESTAMP_KEY = 'archive-requests-cache-timestamp';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // Vérifier le cache
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const now = Date.now();
    
    if (cached && timestamp && (now - parseInt(timestamp)) < CACHE_DURATION) {
      try {
        return JSON.parse(cached);
      } catch(e) {
        // Cache invalide, continuer pour charger depuis l'API
      }
    }
    
    // Charger depuis l'API
    try {
      const userUuid = await getUserUuid(pydio);
      if (!userUuid) {
        console.warn('[ArchiveRequest] Cannot load history: user UUID not available');
        return cached ? JSON.parse(cached) : [];
      }
      
      const endpoint = getEndpoint();
      const response = await fetch(`${endpoint}/api/v1/archives-requests?user_uuid=${userUuid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      // Adapter selon la structure de votre API (data.data, data.items, ou data directement)
      const items = data.data || data.items || (Array.isArray(data) ? data : []);
      
      // Mettre à jour le cache
      localStorage.setItem(CACHE_KEY, JSON.stringify(items));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, String(now));
      
      return items;
    } catch(error) {
      console.error('[ArchiveRequest] Failed to load history:', error);
      // Retourner le cache même s'il est expiré en cas d'erreur
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch(e) {}
      }
      return [];
    }
  };

  const onClick = () => {
    try{
      const holder = pydio && pydio.getContextHolder ? pydio.getContextHolder() : null;
      const selection = holder ? holder.getSelectedNodes() : [];
      if (!selection || selection.length === 0) return;
      setFiles(selection);
      setOpen(true);
    } catch(e){
      console.error('[ArchiveRequest] cannot retrieve selection', e);
    }
  }

  const onSubmit = async (comment, nodes) => {
    if (!nodes || nodes.length === 0) {
      if (pydio && pydio.displayMessage) {
        pydio.displayMessage('ERROR', 'Aucun fichier sélectionné');
      }
      return;
    }

    // Get user and workspace info
    const userUuid = await getUserUuid(pydio);
    const userInfo = {
      uuid: userUuid,
      login: (pydio && pydio.user && pydio.user.id) || 'unknown'
    };

    let workspaceUuid = null;
    try {
      if (pydio && pydio.user && pydio.user.getActiveRepositoryObject) {
        const activeRepo = pydio.user.getActiveRepositoryObject();
        if (activeRepo && activeRepo.getId) {
          workspaceUuid = activeRepo.getId();
        }
      }
    } catch(e) {
      console.warn('[ArchiveRequest] Could not get workspace UUID', e);
    }

    const workspaceInfo = { uuid: workspaceUuid };

    setUploading(true);
    setUploadProgress({current: 0, total: nodes.length});

    const results = {
      success: [],
      failed: []
    };

    // Process each file
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      try {
        let fileName = '';
        try {
          fileName = PathUtils.getBasename(node.getPath ? node.getPath() : (node.Path || node.label || 'file'));
        } catch(e) {
          fileName = `file_${i + 1}`;
        }

        // Download file and send to API
        const fileBlob = await downloadFileAsBlob(node);
        await sendArchiveRequest(fileBlob, fileName, userInfo, workspaceInfo, comment);
        results.success.push({file: fileName, node: node});
        
        // Update progress after successful processing
        setUploadProgress({current: i + 1, total: nodes.length});
      } catch(error) {
        const fileName = node.getPath ? PathUtils.getBasename(node.getPath()) : `file_${i + 1}`;
        results.failed.push({file: fileName, error: error.message || String(error), node: node});
        console.error(`[ArchiveRequest] Failed to process file ${fileName}:`, error);
        // Update progress even on failure
        setUploadProgress({current: i + 1, total: nodes.length});
      }
    }

    setUploading(false);
    setUploadProgress({current: 0, total: 0});

    // Display results
    if (results.success.length > 0 && results.failed.length === 0) {
      const msg = results.success.length === 1 
        ? "Demande d'archive envoyée avec succès"
        : `${results.success.length} demandes d'archive envoyées avec succès`;
      if (pydio && pydio.displayMessage) {
        pydio.displayMessage('SUCCESS', msg);
      }
      setOpen(false);
      // Invalidate cache to force refresh on next history load
      localStorage.removeItem('archive-requests-cache-timestamp');
    } else if (results.success.length > 0 && results.failed.length > 0) {
      const msg = `${results.success.length} succès, ${results.failed.length} échec(s)`;
      if (pydio && pydio.displayMessage) {
        pydio.displayMessage('WARNING', msg);
      }
      const errorDetails = results.failed.map(f => `${f.file}: ${f.error}`).join('\n');
      console.error('[ArchiveRequest] Partial failure:', errorDetails);
    } else {
      // All failed
      let errorMsg = '';
      if (results.failed.length === 1) {
        const firstError = results.failed[0].error;
        if (firstError.includes('réseau') || firstError.includes('NetworkError') || firstError.includes('CORS')) {
          errorMsg = `Erreur de connexion: Impossible d'atteindre l'API. Vérifiez que l'endpoint est accessible et que CORS est configuré.`;
        } else {
          errorMsg = `Erreur: ${firstError}`;
        }
      } else {
        errorMsg = `Toutes les demandes ont échoué (${results.failed.length} fichier(s))`;
        if (results.failed[0] && results.failed[0].error) {
          const firstError = results.failed[0].error;
          if (firstError.includes('réseau') || firstError.includes('NetworkError') || firstError.includes('CORS')) {
            errorMsg += ' - Problème de connexion réseau détecté';
          }
        }
      }
      
      if (pydio && pydio.displayMessage) {
        pydio.displayMessage('ERROR', errorMsg);
      }
      console.error('[ArchiveRequest] All requests failed:', results.failed);
    }
  }

  const onHistoryOpen = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    const items = await loadHistory();
    setHistory(items);
    setHistoryLoading(false);
  };

  const onHistoryRefresh = async () => {
    setHistoryLoading(true);
    // Invalidate cache
    localStorage.removeItem('archive-requests-cache-timestamp');
    const items = await loadHistory();
    setHistory(items);
    setHistoryLoading(false);
  };

  const onHistoryClear = () => {
    localStorage.removeItem('archive-requests-cache');
    localStorage.removeItem('archive-requests-cache-timestamp');
    setHistory([]);
    if (pydio?.displayMessage) {
      pydio.displayMessage('SUCCESS', 'Cache vidé');
    }
  };

  // ============================================
  // ENREGISTREMENT DU BOUTON DANS LE MENU CONTEXTUEL
  // ============================================
  // Cette fonction useEffect s'exécute au chargement du composant
  // Elle crée et enregistre les actions dans le menu contextuel de Pydio
  useEffect(()=>{
    if(!pydio || !pydio.Controller) return;
    
    // ============================================
    // ACTION 1 : "Demande d'archive" (sur les fichiers)
    // ============================================
    const actionArchive = new Action(
      // Paramètre 1 : Options de l'action (nom, icône, texte, callback)
      {
        name: 'archive_request',                    // Nom unique de l'action
        icon_class: 'mdi mdi-archive',              // Icône Material Design Icons
        text: "Archive",                  // Texte affiché dans le menu
        callback: () => onClick()                    // Fonction appelée au clic
      },
      // Paramètre 2 : Contexte d'affichage (où l'action apparaît)
      {
        selection: true,                            // Nécessite une sélection
        dir: false,                                 // N'apparaît PAS sur les dossiers
        actionBar: false,                           // N'apparaît PAS dans la barre d'actions
        actionBarGroup: 'default',
        contextMenu: true,                          // ✅ APPARAÎT DANS LE MENU CONTEXTUEL (clic droit)
        infoPanel: false                            // N'apparaît PAS dans le panneau d'info
      },
      // Paramètre 3 : Contexte de sélection (type de fichiers)
      {
        dir: false,                                 // Ne fonctionne PAS sur les dossiers
        file: true,                                 // ✅ FONCTIONNE SUR LES FICHIERS
        unique: false,                              // Peut fonctionner sur plusieurs fichiers
        multipleOnly: false                         // Peut fonctionner sur un seul fichier
      },
      // Paramètre 4 : Droits requis
      {
        noUser: false,                              // Nécessite un utilisateur connecté
        userLogged: true,                           // ✅ UTILISATEUR DOIT ÊTRE CONNECTÉ
        read: false,                                // Pas besoin de droit de lecture
        write: false                                // Pas besoin de droit d'écriture
      }
    );

    // ============================================
    // ACTION 2 : "Historique des demandes" (sur les dossiers)
    // ============================================
    const actionHistory = new Action(
      {
        name: 'archive_request_history',
        icon_class: 'mdi mdi-history',
        text: 'Historique des demandes',
        callback: () => onHistoryOpen()
      },
      {
        selection: false,                           // Ne nécessite pas de sélection
        dir: true,                                  // ✅ APPARAÎT SUR LES DOSSIERS
        actionBar: false,
        actionBarGroup: 'default',
        contextMenu: true,                          // ✅ APPARAÎT DANS LE MENU CONTEXTUEL
        infoPanel: false
      },
      {
        dir: true,                                  // ✅ FONCTIONNE SUR LES DOSSIERS
        file: false,                                // Ne fonctionne PAS sur les fichiers
        unique: true                                // Un seul dossier à la fois
      },
      {
        noUser: false,
        userLogged: true                            // ✅ UTILISATEUR DOIT ÊTRE CONNECTÉ
      }
    );

    // ============================================
    // ENREGISTREMENT DES ACTIONS DANS LE CONTROLLER
    // ============================================
    // Ces lignes ajoutent les actions au système de menus de Pydio
    pydio.Controller.registerAction(actionArchive);
    pydio.Controller.registerAction(actionHistory);
    pydio.Controller.notify('actions_refreshed');   // Notifie Pydio que les actions ont changé

    // Nettoyage lors du démontage du composant
    return () => {
      if(pydio && pydio.Controller){ 
        pydio.Controller.notify('actions_refreshed'); 
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pydio]);

  return (
    <>
      <ArchiveRequestDialog 
        open={open} 
        onClose={()=>setOpen(false)} 
        files={files} 
        onSubmit={onSubmit}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />
      {historyOpen && (
        <ArchiveRequestHistoryDialog
          open={historyOpen}
          onClose={()=>setHistoryOpen(false)}
          items={history}
          loading={historyLoading}
          onRefresh={onHistoryRefresh}
          onClear={onHistoryClear}
        />
      )}
    </>
  );
}