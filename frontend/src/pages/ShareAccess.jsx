import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Lock, Download, AlertTriangle, FileText, Shield, Key } from 'lucide-react';

export default function ShareAccess() {
  const { token } = useParams();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [share, setShare] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (user && session) {
      verifyShare();
    }
  }, [user, session]);

  const verifyShare = async (pwd = null) => {
    setLoading(true);
    setAuthError('');
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      if (pwd) headers['x-share-password'] = pwd;

      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/shares/access/${token}`, { headers });
      setShare(res.data.share);
      setRequiresPassword(false);
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.requiresPassword) {
        setRequiresPassword(true);
        if (pwd) setAuthError(err.response.data.error || 'Incorrect password.');
      } else {
        setError(err.response?.data?.error || 'Failed to access share.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) return;
    verifyShare(password);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      if (password) headers['x-share-password'] = password;

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/shares/access/${token}/download`, {}, { headers });
      const a = document.createElement('a');
      a.href = res.data.url;
      a.download = share.files.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      if (share.download_limit) {
        setShare({...share, downloads_count: share.downloads_count + 1});
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate download link.');
    } finally {
      setDownloading(false);
    }
  };

  const containerStyle = {
    height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
    background: 'radial-gradient(circle at center, var(--bg-charcoal) 0%, var(--bg-obsidian) 100%)',
    position: 'relative'
  };

  if (!user) {
    return (
      <div style={containerStyle}>
        <div className="scanline-overlay"></div>
        <div className="bv-panel" style={styles.card}>
          <div style={styles.iconBox}><Shield size={48} color="var(--accent-amber)" /></div>
          <h2 style={{ color: 'var(--accent-amber)', marginBottom: '1rem' }}>UNAUTHORIZED ACCESS</h2>
          <p style={{ color: 'var(--text-muted)' }}>You must establish identity to access this vault item.</p>
          <button onClick={() => navigate('/login')} className="bv-btn bv-btn-primary" style={{ width: '100%', marginTop: '2rem' }}>PROCEED TO LOGIN</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <div className="scanline-overlay"></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
           <div className="bv-badge bv-badge-active" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>VERIFYING SECURE TOKEN...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div className="scanline-overlay"></div>
        <div className="bv-panel" style={{ ...styles.card, borderColor: 'var(--accent-red)' }}>
          <div style={{ ...styles.iconBox, borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
            <AlertTriangle size={48} color="var(--accent-red)" />
          </div>
          <h2 style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>ACCESS DENIED</h2>
          <p style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="bv-btn bv-btn-danger" style={{ width: '100%', marginTop: '2rem' }}>RETURN TO DASHBOARD</button>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div style={containerStyle}>
        <div className="scanline-overlay"></div>
        <div className="bv-panel" style={styles.card}>
          <div style={styles.iconBox}><Key size={48} color="var(--accent-amber)" /></div>
          <h2 style={{ color: 'var(--accent-amber)', marginBottom: '1rem' }}>PASSWORD PROTECTED</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            This vault item requires a decryption key to access.
          </p>
          <form onSubmit={handlePasswordSubmit}>
            <input 
              type="password" 
              placeholder="Enter secure password..." 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bv-input"
              style={{ textAlign: 'center', letterSpacing: '2px' }}
            />
            {authError && <div style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '1rem' }}>{authError}</div>}
            <button type="submit" className="bv-btn" style={{ width: '100%', marginTop: '1.5rem', color: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}>UNLOCK VAULT</button>
          </form>
          <button onClick={() => navigate('/dashboard')} className="bv-btn" style={{ width: '100%', marginTop: '1rem', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>CANCEL</button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div className="scanline-overlay"></div>
      <div className="bv-panel" style={{ ...styles.card, maxWidth: '600px' }}>
        <div style={{ ...styles.iconBox, color: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald-glow)' }}>
          <FileText size={48} color="var(--accent-emerald)" />
        </div>
        <h2 style={{ color: 'var(--accent-emerald)', marginBottom: '1rem' }}>SECURE CONNECTION ESTABLISHED</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
          Identity verified. Vault item is ready for secure extraction.
        </p>

        <div style={styles.fileDetails}>
          <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>{share.files.filename}</div>
          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {(share.files.size_bytes / 1024 / 1024).toFixed(2)} MB • {(share.files.file_type || 'Unknown').split('/')[1] || share.files.file_type}
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '1.5rem' }}>
            {share.expires_at && (
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>EXPIRES</div>
                <div style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {new Date(share.expires_at).toLocaleString()}
                </div>
              </div>
            )}
            {share.download_limit && (
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>DOWNLOAD LIMIT</div>
                <div style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {share.downloads_count} / {share.download_limit} USED
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleDownload} 
          className="bv-btn bv-btn-primary"
          style={{ width: '100%', marginTop: '2rem' }}
          disabled={downloading}
        >
          {downloading ? 'EXTRACTING SECURE PAYLOAD...' : 'SECURE DOWNLOAD'}
        </button>
        <button onClick={() => navigate('/dashboard')} className="bv-btn" style={{ width: '100%', marginTop: '1rem', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>RETURN TO DASHBOARD</button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    textAlign: 'center', maxWidth: '450px', width: '90%',
    padding: '3rem 2rem', position: 'relative', zIndex: 10
  },
  iconBox: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '80px', height: '80px',
    backgroundColor: 'var(--bg-obsidian)',
    border: '1px solid var(--border-subtle)',
    marginBottom: '1.5rem'
  },
  fileDetails: {
    backgroundColor: 'var(--bg-obsidian)', border: '1px solid var(--border-subtle)', 
    padding: '2rem', textAlign: 'left'
  }
};
