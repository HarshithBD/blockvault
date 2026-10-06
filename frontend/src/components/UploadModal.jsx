import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, X, CheckCircle, AlertTriangle, File as FileIcon } from 'lucide-react';

export default function UploadModal({ onClose, onUploadComplete }) {
  const { session } = useAuth();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => { 
    e.preventDefault(); 
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${session.access_token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      setStatus('success');
      setTimeout(() => {
        onUploadComplete(res.data.file);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.response?.data?.error || err.message);
    }
  };

  return (
    <div style={styles.overlay}>
      <div className="bv-panel" style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{color: 'var(--accent-cyan)'}}>ADD TO VAULT</h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={24} color="var(--text-muted)"/></button>
        </div>
        
        {status === 'idle' && !file && (
          <div 
            style={{
              ...styles.dropzone,
              borderColor: isDragging ? 'var(--accent-cyan)' : 'var(--border-subtle)',
              backgroundColor: isDragging ? 'var(--bg-charcoal)' : 'var(--bg-obsidian)'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={64} color={isDragging ? "var(--accent-cyan)" : "var(--text-muted)"} style={{ transition: 'all 0.2s' }} />
            <h3 style={{ marginTop: '1.5rem', color: isDragging ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
              DROP FILE INTO VAULT
            </h3>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>or click to browse</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
        )}

        {file && status === 'idle' && (
          <div style={styles.filePreview}>
            <FileIcon size={32} color="var(--accent-emerald)" />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {file.name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown Type'}
              </div>
            </div>
            <button onClick={() => setFile(null)} className="bv-btn bv-btn-danger" style={{ padding: '0.5rem' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {status === 'uploading' && (
          <div style={styles.progressContainer}>
            <div style={{ position: 'relative', width: '100%', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
               <h2 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>
                 ENCRYPTING & UPLOADING
               </h2>
               <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'var(--text-primary)' }}>{progress}%</div>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div style={styles.successState}>
            <CheckCircle size={64} color="var(--accent-emerald)" />
            <h2 style={{ marginTop: '1.5rem', color: 'var(--accent-emerald)' }}>SECURELY VAULTED</h2>
          </div>
        )}

        {status === 'error' && (
          <div style={styles.errorState}>
            <AlertTriangle size={64} color="var(--accent-red)" />
            <h3 style={{ marginTop: '1.5rem', color: 'var(--accent-red)' }}>UPLOAD FAILED</h3>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{errorMsg}</p>
            <button onClick={() => setStatus('idle')} className="bv-btn bv-btn-danger" style={{ marginTop: '1.5rem' }}>
              INITIALIZE RETRY
            </button>
          </div>
        )}

        {file && status === 'idle' && (
          <button onClick={handleUpload} className="bv-btn bv-btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '2rem' }}>
            INITIATE UPLOAD SEQUENCE
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    backdropFilter: 'blur(5px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
  },
  modal: {
    width: '100%', maxWidth: '550px',
    padding: '2.5rem',
    position: 'relative'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 },
  dropzone: {
    border: '2px dashed var(--border-subtle)',
    padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex', flexDirection: 'column', alignItems: 'center'
  },
  filePreview: {
    display: 'flex', alignItems: 'center', gap: '1.5rem',
    padding: '1.5rem', backgroundColor: 'var(--bg-obsidian)', 
    border: '1px solid var(--accent-emerald-glow)',
    color: 'var(--text-primary)'
  },
  progressContainer: { textAlign: 'center', padding: '2rem 0' },
  progressBar: { width: '100%', height: '4px', backgroundColor: 'var(--bg-charcoal)', marginTop: '2rem', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'var(--accent-cyan)', transition: 'width 0.2s ease', boxShadow: '0 0 10px var(--accent-cyan-glow)' },
  successState: { textAlign: 'center', padding: '3rem 2rem' },
  errorState: { textAlign: 'center', padding: '3rem 2rem' }
};
