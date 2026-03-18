/*
 * ArchiveRequestDialog - simple modal to submit archive requests
 */
import React, {useState} from 'react';
import Dialog from '../Components/stepper/Dialog';
import ModalAppBar from '../Components/views/ModalAppBar';

export default function ArchiveRequestDialog({open, onClose, files, onSubmit, uploading, uploadProgress}){
  const [comment, setComment] = useState('');
  if (!open) return null;
  const list = Array.isArray(files) ? files : [];
  return (
    <Dialog 
      open={open} 
      onDismiss={onClose} 
      dialogProps={{
        modal: true,
        contentStyle: {width: 600, maxWidth: '90%'}
      }}
    >
      <ModalAppBar title={"Demande d'archive"} onClose={onClose} />
      <div style={{padding:16}}>
        <div style={{marginBottom:12}}>
          <b>Fichiers sélectionnés ({list.length})</b>
          <ul style={{maxHeight:180, overflow:'auto', marginTop:8, paddingLeft:20, marginBottom:0}}>
            {list.map((n,i)=>{
              let label = '';
              try {
                label = n.getPath ? n.getPath() : (n.Path || n.label || String(n));
              } catch(e) { label = String(n); }
              return (<li key={i} style={{marginBottom:4}}>{label}</li>);
            })}
          </ul>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:16}}>
          <label style={{fontWeight:'bold'}}>Commentaire (raison de la demande)</label>
          <textarea 
            rows={4} 
            value={comment} 
            onChange={e=>setComment(e.target.value)} 
            style={{width:'100%', padding:8, border:'1px solid #ddd', borderRadius:4, fontFamily:'inherit', fontSize:14}} 
            placeholder="Décrivez la raison de votre demande d'archive..."
          />
        </div>
        {uploading && uploadProgress && uploadProgress.total > 0 && (
          <div style={{marginTop:16, padding:12, background:'#f5f5f5', borderRadius:4}}>
            <div style={{fontSize:13, marginBottom:8, color:'#666'}}>
              Envoi en cours... {uploadProgress.current} / {uploadProgress.total}
            </div>
            <div style={{width:'100%', height:8, background:'#e0e0e0', borderRadius:4, overflow:'hidden'}}>
              <div 
                style={{
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                  height: '100%',
                  background: '#2196F3',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:20}}>
          <button 
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: 4,
              background: uploading ? '#f5f5f5' : '#fff',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              opacity: uploading ? 0.6 : 1
            }}
          >
            Annuler
          </button>
          <button 
            disabled={list.length===0 || comment.trim()==='' || uploading} 
            onClick={()=>onSubmit(comment, list)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 4,
              background: (list.length===0 || comment.trim()==='' || uploading) ? '#ccc' : '#2196F3',
              color: '#fff',
              cursor: (list.length===0 || comment.trim()==='' || uploading) ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            {uploading ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}