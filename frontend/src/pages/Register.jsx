import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password 
    });
    
    if (error) {
      setError(error.message);
    } else {
      setMessage('Registration successful! Check your email to verify (or just login if auto-confirm is enabled).');
      setTimeout(() => navigate('/dashboard'), 2000);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h2>BLOCKVAULT REGISTER</h2>
      {error && <div style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '10px' }}>{error}</div>}
      {message && <div style={{ color: 'green', border: '1px solid green', padding: '10px', marginBottom: '10px' }}>{message}</div>}
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label>Email</label><br/>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>Password</label><br/>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>
        <button disabled={loading} type="submit" style={{ padding: '10px', background: '#0f766e', color: 'white', border: 'none', cursor: 'pointer' }}>Register</button>
      </form>
      <p style={{ marginTop: '20px' }}>Already have an account? <Link to="/login">Login here</Link></p>
    </div>
  );
}
