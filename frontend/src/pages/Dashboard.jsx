import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import UploadModal from '../components/UploadModal';
import FileList from '../components/FileList';
import ShareList from '../components/ShareList';
import Activity from './Activity';
import { HardDrive, Share2, Activity as ActivityIcon, ShieldCheck, Search, Bell, User, LogOut, File, Shield, Lock, Box, Clock, Download, PieChart, ChevronRight } from 'lucide-react';

// Reusable animated background
const VoxelBackground = () => (
  <div className="cinematic-bg">
    <div className="vault-lock-bg"></div>
    <div className="voxel-world">
      <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', zIndex: -4, opacity: 0.15 }}>
        <Lock size={400} color="var(--accent-neon-0)" strokeWidth={1} style={{ filter: 'drop-shadow(0 0 40px var(--accent-neon-0))' }} />
      </div>
      
      {/* Decorative floating cubes */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="voxel-cube" style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${Math.random() * 60 + 20}px`,
          height: `${Math.random() * 60 + 20}px`,
          animation: `float-cube ${Math.random() * 5 + 4}s infinite alternate ease-in-out`,
          animationDelay: `-${Math.random() * 5}s`,
          opacity: Math.random() * 0.5 + 0.1,
          boxShadow: Math.random() > 0.7 ? 'inset 0 0 15px rgba(0,255,213,0.3)' : 'none'
        }}></div>
      ))}
    </div>
  </div>
);

export default function Dashboard() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('center'); // 'center', 'vault', 'shares', 'activity'
  const [stats, setStats] = useState({ totalFiles: 0, sharedFiles: 0, activeShares: 0, totalDownloads: 0, expiredShares: 0, storageUsedBytes: 0 });

  useEffect(() => {
    if (session) fetchStats();
  }, [refreshTrigger, session]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/files/stats`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      // Enhance stats with dummy expired shares for visual completeness if backend doesn't provide
      setStats({
        ...res.data.stats,
        expiredShares: res.data.stats.expiredShares || 0,
        storageUsedBytes: res.data.stats.storageUsedBytes || (res.data.stats.totalFiles * 2.4 * 1024 * 1024) // mock calculation if missing
      });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!user) return null;

  return (
    <div style={styles.container}>
      <VoxelBackground />
      
      {/* LEFT SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.logoBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Box size={32} color="var(--text-primary)" fill="var(--accent-neon-0)" strokeWidth={1} />
            <h2 style={styles.logoText}>BLOCKVAULT</h2>
          </div>
          <p style={{ color: 'var(--accent-cyan-0)', fontSize: '0.7rem', marginTop: '0.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
            Secure file sharing.<br/>Controlled access.
          </p>
        </div>
        
        <div style={styles.nav}>
          <NavItem active={activeTab === 'center'} icon={<ActivityIcon size={18}/>} label="Dashboard" onClick={() => setActiveTab('center')} />
          <NavItem active={activeTab === 'vault'} icon={<HardDrive size={18}/>} label="My Files" onClick={() => setActiveTab('vault')} />
          <NavItem active={activeTab === 'shares'} icon={<Share2 size={18}/>} label="Shared By Me" onClick={() => setActiveTab('shares')} />
          <NavItem active={activeTab === 'activity'} icon={<Clock size={18}/>} label="Activity" onClick={() => setActiveTab('activity')} />
          <NavItem active={false} icon={<UploadModalIcon size={18}/>} label="Upload" onClick={() => setShowUpload(true)} />
          <div style={{ margin: '1rem 0', borderBottom: '1px solid var(--border-subtle)' }}></div>
          <NavItem active={false} icon={<PieChart size={18}/>} label="Analytics" />
          <NavItem active={false} icon={<Bell size={18}/>} label="Notifications" />
          <NavItem active={false} icon={<LogOut size={18}/>} label="Logout" onClick={handleSignOut} isDanger />
        </div>
        
        {/* SIDEBAR LOWER AREA - STORAGE */}
        <div style={styles.sidebarStorage}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-primary)' }}>Storage</span>
            <span style={{ color: 'var(--accent-neon-0)' }}>{(stats.storageUsedBytes / 1024 / 1024 / 1024).toFixed(2)} GB / 10 GB</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-dark-0)', borderRadius: '3px', overflow: 'hidden' }}>
             <div style={{ width: `${Math.min(100, (stats.storageUsedBytes / 1024 / 1024 / 1024 / 10) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan-0), var(--accent-neon-0), var(--accent-emerald-0))', boxShadow: '0 0 10px var(--accent-neon-0)' }}></div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={styles.main}>
        {/* TOP HEADER */}
        <header style={styles.header}>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.75rem', textTransform: 'none', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
              Welcome back, <span style={{ color: 'var(--accent-neon-0)' }}>{user.email.split('@')[0]}</span>!
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Your files are safe. Your control is in your hands.
            </p>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.searchBox}>
              <Search size={16} color="var(--text-muted)" style={{position: 'absolute', left: '12px'}} />
              <input type="text" placeholder="Search files, recipients, or senders..." style={styles.searchInput} />
              <div style={styles.searchShortcut}>Ctrl K</div>
            </div>
            <button style={styles.iconBtn}><Bell size={20} color="var(--text-secondary)" /></button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                 <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>{user.email.split('@')[0]}</div>
                 <div style={{ color: 'var(--accent-neon-0)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>PRO PLAN</div>
              </div>
              <div style={styles.avatar}><User size={20} color="var(--bg-dark-0)" /></div>
            </div>
          </div>
        </header>

        {/* SECURITY TAGLINE */}
        <div style={{ position: 'absolute', top: '100px', right: '3rem', fontFamily: 'var(--font-heading)', fontSize: '0.7rem', color: 'var(--accent-neon-0)', letterSpacing: '3px', textShadow: '0 0 10px var(--accent-neon-0)', zIndex: 10 }}>
          SECURE ◆ CONTROLLED ◆ FOREVER
        </div>

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <div style={styles.scrollArea}>
          
          {/* STATS ROW */}
          <div style={styles.statsGrid}>
            <StatCard icon={<File size={20} color="var(--accent-cyan-0)" />} value={stats.totalFiles} label="Total Files" />
            <StatCard icon={<HardDrive size={20} color="var(--accent-neon-0)" />} value={`${(stats.storageUsedBytes / 1024 / 1024).toFixed(1)}`} suffix="MB" label="Storage Used" />
            <StatCard icon={<Share2 size={20} color="var(--accent-emerald-0)" />} value={stats.sharedFiles} label="Files Shared" />
            <StatCard icon={<ShieldCheck size={20} color="var(--accent-neon-0)" />} value={stats.activeShares} label="Active Shares" />
            <StatCard icon={<Clock size={20} color="var(--accent-warning)" />} value={stats.expiredShares} label="Expired Shares" />
            <StatCard icon={<Download size={20} color="var(--accent-cyan-0)" />} value={stats.totalDownloads} label="Total Downloads" />
          </div>

          <div style={styles.dashboardGrid}>
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="bv-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: 'var(--text-primary)' }}>
                    {activeTab === 'center' ? 'Recent Files' : activeTab === 'vault' ? 'My Vault' : activeTab === 'shares' ? 'Shared Files' : 'Activity'}
                  </h3>
                  <div style={{ color: 'var(--accent-neon-0)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    View all <ChevronRight size={14} />
                  </div>
                </div>

                <div style={{ padding: '1.5rem' }}>
                  {activeTab === 'center' || activeTab === 'vault' ? (
                     <FileList refreshTrigger={refreshTrigger} />
                  ) : activeTab === 'shares' ? (
                     <ShareList />
                  ) : (
                     <Activity embedded={true} />
                  )}
                </div>
              </div>

              {/* BOTTOM FEATURE CARDS */}
              {activeTab === 'center' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                   <FeatureCard icon={<Shield size={16} />} title="Secure Sharing" sub="Share with confidence" />
                   <FeatureCard icon={<Lock size={16} />} title="Controlled Access" sub="Only the right people" />
                   <FeatureCard icon={<Clock size={16} />} title="Expiring Links" sub="Time-based access" />
                   <FeatureCard icon={<Download size={16} />} title="Download Tracking" sub="Full visibility" />
                </div>
              )}

            </div>

            {/* RIGHT COLUMN */}
            {activeTab === 'center' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* STORAGE PANEL */}
                <div className="bv-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                  <h3 style={{ width: '100%', textAlign: 'left', color: 'var(--text-primary)', marginBottom: '2rem' }}>Storage Usage</h3>
                  
                  {/* CSS Donut representation */}
                  <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'conic-gradient(var(--accent-neon-0) 0% 12%, var(--bg-surface-1) 12% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0, 255, 213, 0.1)' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>12%</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Used</span>
                    </div>
                  </div>

                  <div style={{ width: '100%', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Used</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(stats.storageUsedBytes / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Available</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(10 - (stats.storageUsedBytes / 1024 / 1024 / 1024)).toFixed(2)} GB</span>
                    </div>
                  </div>

                  <button onClick={() => setShowUpload(true)} className="bv-btn bv-btn-primary" style={{ width: '100%', marginTop: '2rem' }}>
                    UPLOAD FILES
                  </button>
                </div>

                {/* RECENT ACTIVITY */}
                <div className="bv-panel" style={{ padding: '0' }}>
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
                    <div style={{ color: 'var(--accent-neon-0)', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => setActiveTab('activity')}>View all →</div>
                  </div>
                  <div style={{ padding: '1rem' }}>
                     <Activity embedded={true} limit={4} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showUpload && (
        <UploadModal 
          onClose={() => setShowUpload(false)} 
          onUploadComplete={handleUploadComplete} 
        />
      )}
    </div>
  );
}

// Dummy icon for upload
const UploadModalIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
)

function NavItem({ active, icon, label, onClick, isDanger }) {
  const normalColor = isDanger ? 'var(--accent-danger)' : 'var(--text-secondary)';
  const activeColor = 'var(--accent-neon-0)';

  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.85rem 1.5rem',
        cursor: 'pointer',
        borderLeft: active ? `3px solid ${activeColor}` : '3px solid transparent',
        backgroundColor: active ? 'rgba(0, 255, 213, 0.05)' : 'transparent',
        color: active ? activeColor : normalColor,
        fontFamily: 'var(--font-heading)',
        fontSize: '1rem',
        letterSpacing: '1px',
        transition: 'all 0.2s ease',
        textShadow: active ? `0 0 10px rgba(0, 255, 213, 0.3)` : 'none'
      }}
      onMouseEnter={(e) => { 
        if (!active) e.currentTarget.style.color = isDanger ? 'var(--accent-danger)' : 'var(--text-primary)';
        if (!active) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
      }}
      onMouseLeave={(e) => { 
        if (!active) e.currentTarget.style.color = normalColor;
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ filter: active ? `drop-shadow(0 0 5px ${activeColor})` : 'none' }}>{icon}</div>
      <span>{label}</span>
    </div>
  );
}

function StatCard({ icon, value, suffix = '', label }) {
  return (
    <div className="bv-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--bg-surface-0)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{label}</div>
        <div style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontWeight: 700, marginTop: '0.25rem' }}>
          {value} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{suffix}</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, sub }) {
  return (
    <div className="bv-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(3, 20, 27, 0.4)' }}>
      <div style={{ color: 'var(--accent-neon-0)' }}>{icon}</div>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{sub}</div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' },
  sidebar: { 
    width: '280px', 
    backgroundColor: 'rgba(1, 14, 22, 0.8)', 
    borderRight: '1px solid var(--border-subtle)', 
    display: 'flex', flexDirection: 'column', 
    zIndex: 10,
    backdropFilter: 'blur(20px)'
  },
  logoBox: { padding: '2rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' },
  logoText: { color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', letterSpacing: '2px' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 0', overflowY: 'auto' },
  sidebarStorage: { padding: '1.5rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-dark-3)' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', zIndex: 5, overflow: 'hidden' },
  header: { 
    padding: '1.5rem 2.5rem', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'transparent',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    zIndex: 10
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  searchBox: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchInput: { 
    background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '24px',
    padding: '0.6rem 4rem 0.6rem 2.5rem', color: 'var(--text-primary)', 
    fontFamily: 'var(--font-mono)', outline: 'none', width: '300px', fontSize: '0.85rem'
  },
  searchShortcut: { position: 'absolute', right: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-dark-0)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' },
  iconBtn: { background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', padding: '0.6rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  scrollArea: { flex: 1, overflowY: 'auto', padding: '2rem 3rem' },
  statsGrid: { 
    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', 
    marginBottom: '2rem'
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 350px',
    gap: '2rem'
  }
};
