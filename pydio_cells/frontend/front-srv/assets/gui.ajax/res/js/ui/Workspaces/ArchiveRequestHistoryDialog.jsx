/*
 * ArchiveRequestHistoryDialog - lists archive requests from API with cache
 */
import React from 'react';
import Dialog from '../Components/stepper/Dialog';
import ModalAppBar from '../Components/views/ModalAppBar';

export default function ArchiveRequestHistoryDialog({open, onClose, items = [], loading = false, onRefresh, onClear}){
  if (!open) return null;
  
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = 'archive-requests.json'; 
    a.click();
    URL.revokeObjectURL(url);
  }
  
  return (
    <Dialog 
      open={open} 
      onDismiss={onClose} 
      dialogProps={{
        modal: true,
        contentStyle: {width: 720, maxWidth: '90%'}
      }}
    >
      <ModalAppBar title={"Historique des demandes d'archive"} onClose={onClose} />
      <div style={{padding:16}}>
        <div style={{marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <b>Total: {items.length}</b>
          {loading && <span style={{fontSize:13, color:'#666'}}>Chargement...</span>}
        </div>
        <div style={{maxHeight:360, overflow:'auto', border:'1px solid var(--divider, #ddd)', borderRadius:4}}>
          <table style={{width:'100%', fontSize:13, borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f5f5f5', borderBottom:'2px solid #ddd'}}>
                <th style={{textAlign:'left', padding:'8px', fontWeight:'bold'}}>Date</th>
                <th style={{textAlign:'left', padding:'8px', fontWeight:'bold'}}>Fichier</th>
                <th style={{textAlign:'left', padding:'8px', fontWeight:'bold'}}>Utilisateur</th>
                <th style={{textAlign:'left', padding:'8px', fontWeight:'bold'}}>Statut</th>
                <th style={{textAlign:'left', padding:'8px', fontWeight:'bold'}}>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx)=> {
                // Adapter selon la structure de votre API
                const date = it.created_at || it.CreatedAt || it.when;
                const fileName = it.nom || it.file_name || it.FileName || (it.files && it.files[0] && it.files[0].path) || 'N/A';
                const user = it.user_login || it.user || it.UserLogin || 'N/A';
                const status = it.status || it.Status || 'pending';
                const comment = it.comment || it.Comment || '';
                
                return (
                  <tr key={idx} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{verticalAlign:'top', padding:'8px'}}>
                      {date ? new Date(date).toLocaleString('fr-FR') : 'N/A'}
                    </td>
                    <td style={{verticalAlign:'top', padding:'8px', maxWidth:200, wordBreak:'break-word'}}>
                      {fileName}
                    </td>
                    <td style={{verticalAlign:'top', padding:'8px'}}>{user}</td>
                    <td style={{verticalAlign:'top', padding:'8px'}}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        background: status === 'approved' ? '#4caf50' : 
                                   status === 'rejected' ? '#f44336' : '#ff9800',
                        color: '#fff'
                      }}>
                        {status}
                      </span>
                    </td>
                    <td style={{verticalAlign:'top', padding:'8px', maxWidth:200, wordBreak:'break-word'}}>
                      {comment || '-'}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{padding:'16px', textAlign:'center', color:'#999'}}>
                    Aucune demande enregistrée.
                  </td>
                </tr>
              )}
              {loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{padding:'16px', textAlign:'center', color:'#999'}}>
                    Chargement...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:16}}>
          <button 
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: 4,
              background: loading ? '#f5f5f5' : '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              color: loading ? '#999' : '#000'
            }}
          >
            {loading ? 'Actualisation...' : 'Actualiser'}
          </button>
          <button 
            onClick={exportJson}
            disabled={items.length === 0}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: 4,
              background: items.length === 0 ? '#f5f5f5' : '#fff',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14,
              color: items.length === 0 ? '#999' : '#000'
            }}
          >
            Exporter JSON
          </button>
          <button 
            onClick={onClear}
            disabled={items.length === 0}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 4,
              background: items.length === 0 ? '#ccc' : '#f44336',
              color: '#fff',
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            Vider le cache
          </button>
        </div>
      </div>
    </Dialog>
  );
}