import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shield, Lock, Eye, EyeOff, Server, Key, Activity } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    let result;
    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      if (!isLogin && !result.data?.session) {
        setError('Registration successful! Please check your email to verify (or try logging in if auto-verify is on).');
        setIsLogin(true);
      } else {
        navigate('/dashboard');
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div className="scanline-overlay"></div>
      
      {/* LEFT PANEL - BRANDING */}
      <div style={styles.leftPanel}>
        <div style={styles.brandingWrapper}>
          <div style={styles.logoBox}>
            <Shield size={64} color="var(--accent-emerald)" strokeWidth={1.5} />
            <h1 style={styles.brandName}>BLOCK<span style={{color: 'var(--text-primary)'}}>VAULT</span></h1>
          </div>
          <p style={styles.tagline}>"Secure. Share. Control."</p>
          
          <div style={styles.securityIndicators}>
            <div style={styles.indicator}><Server size={16} /> END-TO-END RLS</div>
            <div style={styles.indicator}><Key size={16} /> ZERO-TRUST ARCHITECTURE</div>
            <div style={styles.indicator}><Activity size={16} /> AUDIT LOGGING ACTIVE</div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - AUTH FORM */}
      <div style={styles.rightPanel}>
        <div className="bv-panel" style={styles.authCard}>
          <h2 style={{color: 'var(--accent-cyan)', marginBottom: '0.5rem'}}>
            {isLogin ? 'SYSTEM ACCESS' : 'INITIALIZE PROTOCOL'}
          </h2>
          <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>
            {isLogin ? 'Authenticate to access your secure vault.' : 'Establish a new secure identity.'}
          </p>

          {error && (
            <div style={styles.errorBox}>
              <div style={{width: '4px', background: 'var(--accent-red)', alignSelf: 'stretch'}}></div>
              <p style={{padding: '0.75rem', margin: 0, fontSize: '0.9rem'}}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>IDENTITY [EMAIL]</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="bv-input"
                placeholder="agent@blockvault.net"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>CREDENTIAL [PASSWORD]</label>
              <div style={{position: 'relative'}}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="bv-input"
                  placeholder="••••••••••••"
                  style={{paddingRight: '3rem'}}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              disabled={loading} 
              type="submit" 
              className="bv-btn bv-btn-primary" 
              style={{marginTop: '1rem', width: '100%'}}
            >
              {loading ? 'PROCESSING...' : isLogin ? 'AUTHENTICATE' : 'REGISTER'}
            </button>
          </form>

          <div style={styles.toggleText}>
            {isLogin ? "Don't have clearance? " : "Already established? "}
            <button 
              type="button" 
              onClick={() => {setIsLogin(!isLogin); setError(null);}} 
              style={styles.toggleBtn}
            >
              {isLogin ? 'REQUEST ACCESS' : 'AUTHENTICATE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
  },
  leftPanel: {
    flex: 1,
    background: 'radial-gradient(circle at center, var(--bg-charcoal) 0%, var(--bg-obsidian) 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '4rem',
    borderRight: '1px solid var(--border-subtle)',
    position: 'relative',
    overflow: 'hidden'
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'var(--bg-obsidian)',
    zIndex: 10
  },
  brandingWrapper: {
    maxWidth: '500px',
    zIndex: 2
  },
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '1rem'
  },
  brandName: {
    fontSize: '3.5rem',
    color: 'var(--accent-cyan)',
    margin: 0,
    lineHeight: 1
  },
  tagline: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.25rem',
    color: 'var(--accent-emerald)',
    marginBottom: '4rem',
    letterSpacing: '2px'
  },
  securityIndicators: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    letterSpacing: '1px'
  },
  authCard: {
    width: '100%',
    maxWidth: '420px',
    position: 'relative'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    textAlign: 'left'
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: 'var(--accent-cyan)',
    letterSpacing: '1px'
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.5rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.25rem'
  },
  errorBox: {
    display: 'flex',
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--accent-red)',
    marginBottom: '1.5rem',
    fontFamily: 'var(--font-mono)',
    textAlign: 'left'
  },
  toggleText: {
    marginTop: '2rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    textAlign: 'center'
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-emerald)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
    textDecoration: 'underline'
  }
};
