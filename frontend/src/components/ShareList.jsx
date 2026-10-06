import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link2, Trash2, ShieldOff, Users, Clock, File, Lock, Download, AlertTriangle } from 'lucide-react';

export default function ShareList() {
  const { session } = useAuth();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/shares', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setShares(res.data.shares);
    } catch (err) {
      setError('Failed to load shares');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('WARNING: Are you sure you want to revoke this share? Any existing links will instantly stop working.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/shares/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setShares(shares.map(s => s.id === id ? { ...s, status: 'revoked' } : s));
    } catch (err) {
      alert('Failed to revoke share');
    }
  };

  const copyLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    // Ideally a toast would show here
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '1rem' }}>
        <div className="bv-badge bv-badge-active">SCANNING ACTIVE SHARES...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>ACTIVE SHARES & ACCESS LOGS</h2>
        <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
          {shares.length} SHARES ACTIVE
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--accent-red)', padding: '1rem', color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }}>
          {error}
        </div>
      )}

      {/* SHARE GRID */}
      <div style={styles.grid}>
        {shares.map(share => {
           let statusClass = "bv-badge ";
           let statusText = share.status.toUpperCase();
           if (share.status === 'active') {
             statusClass += "bv-badge-active";
             // check expiry
             if (share.expires_at && new Date(share.expires_at) < new Date()) {
               statusClass = "bv-badge bv-badge-expired";
               statusText = "EXPIRED";
             }
           } else if (share.status === 'revoked') {
             statusClass += "bv-badge-revoked";
           } else {
             statusClass += "bv-badge-expired";
           }

           return (
            <div key={share.id} className="bv-panel" style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.iconWrapper}>
                  <Link2 size={24} color="var(--accent-cyan)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.filename} title={share.files?.filename}>{share.files?.filename}</div>
                  <div style={styles.fileMeta}>
                    {(share.files?.size_bytes / 1024 / 1024).toFixed(2)} MB • {share.share_recipients?.length > 0 ? 'RESTRICTED LINK' : 'PUBLIC LINK'}
                  </div>
                </div>
              </div>
              
              <div style={styles.cardMid}>
                <div style={styles.metaRow}>
                  <span style={{ color: 'var(--text-muted)' }}>STATUS:</span> 
                  <span className={statusClass}>{statusText}</span>
                </div>
                
                <div style={styles.metaRow}>
                  <span style={{ color: 'var(--text-muted)' }}>EXPIRES:</span> 
                  <span style={{ color: 'var(--text-primary)' }}>
                    {share.expires_at ? new Date(share.expires_at).toLocaleString() : 'Never'}
                  </span>
                </div>
                
                <div style={styles.metaRow}>
                  <span style={{ color: 'var(--text-muted)' }}>DOWNLOADS:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                    {share.downloads_count} {share.download_limit ? `/ ${share.download_limit}` : ''}
                  </span>
                </div>
                
                {share.share_recipients?.length > 0 && (
                  <div style={{...styles.metaRow, flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', marginTop: '0.5rem'}}>
                    <span style={{ color: 'var(--text-muted)' }}>AUTHORIZED RECIPIENTS:</span>
                    <span style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>
                      {share.share_recipients.map(r => r.recipient_email).join(', ')}
                    </span>
                  </div>
                )}
                
                {share.password_hash && (
                  <div style={{...styles.metaRow, justifyContent: 'flex-start', gap: '0.5rem', color: 'var(--accent-red)', marginTop: '0.5rem'}}>
                    <Lock size={12} /> <span>PASSWORD PROTECTED</span>
                  </div>
                )}
              </div>

              <div style={styles.cardActions}>
                {statusText === 'ACTIVE' && (
                  <>
                    <button onClick={() => copyLink(share.token)} className="bv-btn bv-btn-primary" style={{flex: 1, padding: '0.5rem'}} title="Copy Link">
                      <Link2 size={16} /> COPY LINK
                    </button>
                    <button onClick={() => handleRevoke(share.id)} className="bv-btn bv-btn-danger" style={{padding: '0.5rem'}} title="Revoke Share">
                      <ShieldOff size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
           );
        })}
        {shares.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            No active shares in vault.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  grid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
    gap: '1.5rem',
    paddingBottom: '2rem'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem',
    gap: '1rem'
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  iconWrapper: {
    width: '40px', height: '40px',
    backgroundColor: 'var(--bg-charcoal)',
    border: '1px solid var(--border-subtle)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  filename: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.1rem',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontWeight: '600'
  },
  fileMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem'
  },
  cardMid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1rem 0',
    borderTop: '1px dashed var(--border-subtle)',
    borderBottom: '1px dashed var(--border-subtle)',
    flex: 1
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: 'auto',
    height: '2.5rem'
  }
};
