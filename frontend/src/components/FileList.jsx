import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Download, Trash2, File as FileIcon, Share2, Info, Image as ImageIcon, FileText, Video, Archive, MoreVertical } from 'lucide-react';
import ShareModal from './ShareModal';

export default function FileList({ refreshTrigger }) {
  const { session } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [error, setError] = useState('');
  const [fileToShare, setFileToShare] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger, filterType]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let typeParam = '';
      if (filterType === 'Documents') typeParam = 'pdf,document,text';
      if (filterType === 'Images') typeParam = 'image';
      if (filterType === 'Videos') typeParam = 'video';
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/files`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        params: { type: typeParam } // simplified for demo
      });
      setFiles(res.data.files);
    } catch (err) {
      setError('Failed to load files');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const a = document.createElement('a');
      a.href = res.data.url;
      a.download = filename; 
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to securely download file');
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to securely delete this file from the vault?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/files/${fileId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const getFileIcon = (type) => {
    if (!type) return <FileIcon size={20} color="var(--accent-cyan-1)" />;
    if (type.includes('image')) return <ImageIcon size={20} color="var(--accent-emerald-1)" />;
    if (type.includes('video')) return <Video size={20} color="var(--accent-warning)" />;
    if (type.includes('zip') || type.includes('tar') || type.includes('rar')) return <Archive size={20} color="var(--accent-danger)" />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return <FileText size={20} color="var(--accent-neon-0)" />;
    return <FileIcon size={20} color="var(--accent-cyan-1)" />;
  };

  const filters = ['All', 'Documents', 'Images', 'Videos', 'Others'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* FILTER PILLS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {filters.map(f => (
          <button 
            key={f}
            onClick={() => setFilterType(f)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: filterType === f ? '1px solid transparent' : '1px solid var(--border-subtle)',
              background: filterType === f ? 'linear-gradient(90deg, var(--accent-cyan-0), var(--accent-neon-0))' : 'var(--bg-panel)',
              color: filterType === f ? 'var(--bg-dark-0)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: filterType === f ? '0 0 15px rgba(0,255,213,0.3)' : 'none'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 77, 90, 0.1)', borderLeft: '3px solid var(--accent-danger)', padding: '1rem', color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* FILE TABLE */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Name</th>
              <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Size</th>
              <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Uploaded</th>
              <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Status</th>
              <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal' }}>Shared</th>
              <th style={{ padding: '1rem 0.5rem', fontWeight: 'normal', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Scanning Vault...
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  No assets found in this sector.
                </td>
              </tr>
            ) : files.map(file => {
              const d = new Date(file.created_at);
              return (
                <tr key={file.id} style={{ borderBottom: '1px solid rgba(0,255,213,0.05)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '0.5rem', background: 'var(--bg-surface-0)', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                         {getFileIcon(file.file_type)}
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 600 }}>{file.filename}</div>
                        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{(file.file_type || 'Unknown').split('/')[1] || file.file_type}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {(file.size_bytes / 1024 / 1024).toFixed(2)} MB
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{d.toLocaleDateString()}</div>
                    <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <span className={file.is_shared ? "bv-badge bv-badge-active" : "bv-badge"} style={{ padding: '0.2rem 0.75rem', background: file.is_shared ? '' : 'var(--bg-surface-1)', borderColor: file.is_shared ? '' : 'transparent', color: file.is_shared ? '' : 'var(--text-secondary)' }}>
                      {file.is_shared ? 'ACTIVE' : 'PRIVATE'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 0.5rem', color: 'var(--accent-neon-0)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {file.is_shared ? 'Shared' : '0 users'}
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => handleDownload(file.id, file.filename)} className="bv-btn" style={{ padding: '0.4rem', borderColor: 'transparent', color: 'var(--text-secondary)' }} title="Download">
                        <Download size={16} />
                      </button>
                      <button onClick={() => setFileToShare(file)} className="bv-btn" style={{ padding: '0.4rem', borderColor: 'transparent', color: 'var(--accent-neon-0)' }} title="Share">
                        <Share2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(file.id)} className="bv-btn" style={{ padding: '0.4rem', borderColor: 'transparent', color: 'var(--accent-danger)' }} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {fileToShare && (
        <ShareModal file={fileToShare} onClose={() => setFileToShare(null)} />
      )}
    </div>
  );
}
