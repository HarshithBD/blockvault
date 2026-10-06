import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Activity as ActivityIcon, ArrowLeft, Download, UploadCloud, Share2, ShieldOff, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Activity({ embedded = false, limit = 0 }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/activity`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      let activityLogs = res.data.activity;
      if (limit > 0) {
        activityLogs = activityLogs.slice(0, limit);
      }
      setLogs(activityLogs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div style={embedded ? { padding: 0 } : styles.content}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="bv-badge bv-badge-active">SCANNING LOGS...</div>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          No activity detected in vault.
        </div>
      ) : (
        <div style={styles.feed}>
          {logs.map((log) => (
            <div key={log.id} style={styles.feedItem}>
              <div style={styles.timelinePoint(log.action)}></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.feedHeader}>
                  <span style={{...styles.actionBadge, color: getActionColor(log.action), borderColor: getActionColor(log.action) }}>
                    {getActionIcon(log.action)} {formatAction(log.action)}
                  </span>
                  <span style={styles.timestamp}>
                    {formatRelativeTime(log.created_at)}
                  </span>
                </div>
                <div style={{...styles.feedBody, background: embedded ? 'transparent' : 'var(--bg-surface-0)', border: embedded ? 'none' : '1px solid var(--border-subtle)'}}>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                    {log.files?.filename || 'Unknown File'}
                  </span>
                  {log.details?.recipient && (
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                      → {log.details.recipient}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div style={styles.container}>
      <div className="cinematic-bg"></div>
      
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
          <button onClick={() => navigate('/dashboard')} className="bv-btn" style={{ padding: '0.5rem 1rem', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
            <ArrowLeft size={20} /> RETURN
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ActivityIcon size={32} color="var(--accent-neon-0)" style={{ filter: 'drop-shadow(0 0 10px var(--accent-neon-0))' }} />
            <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.75rem' }}>ACTIVITY LOG</h1>
          </div>
        </div>
      </header>
      {content}
    </div>
  );
}

function formatAction(action) {
  return action.replace(/_/g, ' ').toUpperCase();
}

function formatRelativeTime(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getActionColor(action) {
  if (action.includes('delete') || action.includes('revoke')) return 'var(--accent-danger)';
  if (action.includes('upload') || action.includes('create')) return 'var(--accent-emerald-0)';
  if (action.includes('download')) return 'var(--accent-warning)';
  if (action.includes('access')) return 'var(--accent-cyan-0)';
  return 'var(--text-secondary)';
}

function getActionIcon(action) {
  if (action.includes('delete') || action.includes('revoke')) return <ShieldOff size={14} />;
  if (action.includes('upload') || action.includes('create')) return <UploadCloud size={14} />;
  if (action.includes('download')) return <Download size={14} />;
  if (action.includes('access')) return <Eye size={14} />;
  return <ActivityIcon size={14} />;
}

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative'
  },
  header: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '1.5rem',
    background: 'var(--bg-panel)',
    backdropFilter: 'blur(10px)'
  },
  content: {
    maxWidth: '900px',
    margin: '2rem auto',
    padding: '0 1.5rem'
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    position: 'relative'
  },
  feedItem: {
    display: 'flex',
    gap: '1.5rem',
    padding: '1.25rem 0',
    borderBottom: '1px solid rgba(0, 255, 213, 0.05)',
    position: 'relative'
  },
  timelinePoint: (action) => ({
    width: '10px',
    height: '10px',
    backgroundColor: getActionColor(action),
    boxShadow: `0 0 10px ${getActionColor(action)}`,
    marginTop: '0.4rem',
    zIndex: 2,
    position: 'relative'
  }),
  feedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  actionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    border: '1px solid',
    padding: '0.2rem 0.4rem',
    backgroundColor: 'var(--bg-dark-0)'
  },
  timestamp: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  feedBody: {
    padding: '0.75rem',
    borderRadius: '4px'
  }
};
