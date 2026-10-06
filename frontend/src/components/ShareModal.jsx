import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Share2, X, AlertTriangle, CheckCircle, Copy, File as FileIcon, Clock, Users, Shield, Download } from 'lucide-react';

export default function ShareModal({ file, onClose }) {
  const { session } = useAuth();
  const [accessType, setAccessType] = useState('link'); // 'link' or 'restricted'
  const [recipients, setRecipients] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [customExpiry, setCustomExpiry] = useState('');
  const [downloadLimit, setDownloadLimit] = useState('0'); // 0 = unlimited
  const [customLimit, setCustomLimit] = useState('');
  const [protectPassword, setProtectPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [shareResult, setShareResult] = useState(null);

  const handleShare = async () => {
    setStatus('loading');
    try {
      let expiresAt = null;
      if (expiryHours === 'custom' && customExpiry) {
        expiresAt = new Date(customExpiry);
      } else if (expiryHours !== 'never') {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + parseInt(expiryHours));
      }

      const emails = recipients.split(',').map(e => e.trim()).filter(e => e);
      let limit = downloadLimit === 'custom' ? parseInt(customLimit) : parseInt(downloadLimit);
      if (limit === 0 || isNaN(limit)) limit = null;

      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/shares', {
        fileId: file.id,
        accessType,
        recipients: emails,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        downloadLimit: limit,
        password: protectPassword ? password : null
      }, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      setShareResult(res.data.share);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.response?.data?.error || err.message);
    }
  };

  const shareLink = shareResult ? `${window.location.origin}/share/${shareResult.token}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    // Could add toast here
  };

  return (
    <div style={styles.overlay}>
      <div className="bv-panel" style={styles.modal}>
        <div style={styles.header}>
          <h2 style={{color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Share2 size={24} /> SECURE SHARE
          </h2>
          <button onClick={onClose} style={styles.closeBtn}><X size={24} color="var(--text-muted)"/></button>
        </div>

        {status === 'success' ? (
          <div style={styles.successState}>
            <CheckCircle size={56} color="var(--accent-emerald)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ color: 'var(--accent-emerald)', marginBottom: '1.5rem' }}>SHARE CREATED</h2>
            
            <div style={styles.summaryBox}>
               <div style={styles.summaryRow}>
                 <span style={styles.summaryLabel}>FILE:</span>
                 <span style={styles.summaryValue}>{file.filename}</span>
               </div>
               <div style={styles.summaryRow}>
                 <span style={styles.summaryLabel}>RECIPIENT(S):</span>
                 <span style={styles.summaryValue}>{accessType === 'link' ? 'Anyone with link' : recipients}</span>
               </div>
               <div style={styles.summaryRow}>
                 <span style={styles.summaryLabel}>EXPIRES:</span>
                 <span style={styles.summaryValue}>{expiryHours === 'never' ? 'Never' : expiryHours === 'custom' ? new Date(customExpiry).toLocaleString() : `In ${expiryHours} Hours`}</span>
               </div>
               <div style={styles.summaryRow}>
                 <span style={styles.summaryLabel}>DOWNLOADS:</span>
                 <span style={styles.summaryValue}>0 / {downloadLimit === '0' ? 'Unlimited' : downloadLimit === 'custom' ? customLimit : downloadLimit}</span>
               </div>
               <div style={styles.summaryRow}>
                 <span style={styles.summaryLabel}>STATUS:</span>
                 <span className="bv-badge bv-badge-active">ACTIVE</span>
               </div>
            </div>

            <div style={styles.linkBox}>
              <input type="text" readOnly value={shareLink} style={styles.linkInput} />
              <button onClick={copyToClipboard} className="bv-btn bv-btn-primary" style={{ padding: '0 1rem' }}><Copy size={20} /> COPY</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={styles.filePreview}>
              <FileIcon size={24} color="var(--accent-cyan)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.filename}</div>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}><Users size={16} /> ACCESS TYPE</label>
              <select value={accessType} onChange={e => setAccessType(e.target.value)} className="bv-input">
                <option value="link">Public Link (Anyone with link)</option>
                <option value="restricted">Restricted (Specific users only)</option>
              </select>
            </div>

            {accessType === 'restricted' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>RECIPIENTS (Comma separated emails)</label>
                <input 
                  type="text" 
                  value={recipients} 
                  onChange={e => setRecipients(e.target.value)} 
                  placeholder="agent@blockvault.net, admin@vault.com" 
                  className="bv-input"
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}><Clock size={16} /> EXPIRY PROTOCOL</label>
              <select value={expiryHours} onChange={e => setExpiryHours(e.target.value)} className="bv-input">
                <option value="never">No Expiry</option>
                <option value="1">1 Hour</option>
                <option value="6">6 Hours</option>
                <option value="24">24 Hours</option>
                <option value="168">7 Days</option>
                <option value="720">30 Days</option>
                <option value="custom">Custom Date/Time</option>
              </select>
            </div>

            {expiryHours === 'custom' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>CUSTOM EXPIRY</label>
                <input 
                  type="datetime-local" 
                  value={customExpiry} 
                  onChange={e => setCustomExpiry(e.target.value)} 
                  className="bv-input"
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}><Shield size={16} /> SECURITY CONTROLS</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', background: 'var(--bg-obsidian)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={downloadLimit !== '0'} onChange={e => setDownloadLimit(e.target.checked ? '5' : '0')} style={{ marginRight: '8px' }} />
                    Enforce Download Limit
                  </label>
                  {downloadLimit !== '0' && (
                    <div style={{ marginLeft: '1.5rem', marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <select value={downloadLimit} onChange={e => setDownloadLimit(e.target.value)} className="bv-input" style={{ width: 'auto' }}>
                        <option value="5">5 downloads</option>
                        <option value="10">10 downloads</option>
                        <option value="25">25 downloads</option>
                        <option value="custom">Custom...</option>
                      </select>
                      {downloadLimit === 'custom' && (
                        <input type="number" min="1" value={customLimit} onChange={e => setCustomLimit(e.target.value)} placeholder="Limit" className="bv-input" style={{ width: '100px' }} />
                      )}
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', background: 'var(--border-subtle)' }}></div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={protectPassword} onChange={e => setProtectPassword(e.target.checked)} style={{ marginRight: '8px' }} />
                    Require Password
                  </label>
                  {protectPassword && (
                    <div style={{ marginLeft: '1.5rem', marginTop: '0.75rem' }}>
                      <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="Enter secure password" 
                        className="bv-input"
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>

            {status === 'error' && (
              <div style={styles.errorState}>
                <AlertTriangle size={20} color="var(--accent-red)" />
                <span style={{ color: 'var(--accent-red)', marginLeft: '0.75rem', fontFamily: 'var(--font-mono)' }}>{errorMsg}</span>
              </div>
            )}

            <button 
              onClick={handleShare} 
              className="bv-btn"
              style={{ width: '100%', marginTop: '1rem', color: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'CONFIGURING SHARE PROTOCOL...' : 'GENERATE SECURE LINK'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11, 15, 25, 0.9)', backdropFilter: 'blur(5px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
  },
  modal: {
    width: '100%', maxWidth: '550px', padding: '2.5rem',
    position: 'relative'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 },
  filePreview: {
    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
    background: 'var(--bg-charcoal)', border: '1px solid var(--border-subtle)'
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '1px' },
  errorState: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderLeft: '3px solid var(--accent-red)' },
  
  successState: { textAlign: 'center' },
  summaryBox: {
    background: 'var(--bg-obsidian)',
    border: '1px solid var(--border-subtle)',
    padding: '1.5rem',
    textAlign: 'left',
    marginBottom: '2rem'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px dashed var(--border-subtle)'
  },
  summaryLabel: { color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' },
  summaryValue: { color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 'bold' },
  linkBox: { display: 'flex', height: '3rem' },
  linkInput: { flex: 1, backgroundColor: 'var(--bg-charcoal)', border: '1px solid var(--accent-cyan)', color: 'var(--text-primary)', padding: '0 1rem', fontFamily: 'var(--font-mono)', outline: 'none' }
};
