import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Wallet, Mail, Lock, RefreshCw } from 'lucide-react';

export function Auth() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });
        if (loginError) throw loginError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (signUpError) throw signUpError;
        setMessage('Sign-up successful! Check your email to confirm your account.');
      }
    } catch (err) {
      setError(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (googleError) throw googleError;
    } catch (err) {
      setError(err.message || 'Error redirecting to Google.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card glass-card">
        <div className="auth-brand">
          <div className="brand-icon auth-logo-icon">
            <Wallet size={28} />
          </div>
          <h2>CASH FLOW</h2>
          <p>ENTER THE FINANCIAL MATRIX</p>
        </div>

        {/* Tab selection */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('login');
              setError(null);
              setMessage(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signup');
              setError(null);
              setMessage(null);
            }}
          >
            Create Account
          </button>
        </div>

        {error && <div className="auth-alert error">{error}</div>}
        {message && <div className="auth-alert success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-container">
              <Mail className="input-icon" size={16} />
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-container">
              <Lock className="input-icon" size={16} />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="submit-btn auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <RefreshCw size={16} className="spinner-icon" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{activeTab === 'login' ? 'Sign In' : 'Sign Up'}</span>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          className="google-auth-btn" 
          disabled={loading}
          type="button"
        >
          <svg className="google-icon-svg" viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.78-2.4 3.62v3.02h3.87c2.26-2.08 3.58-5.14 3.58-8.49z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.02c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.13C3.26 20.17 7.38 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.6H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.4l3.98-3.13z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.38 0 3.26 3.83 1.29 7.6l3.98 3.13c.95-2.85 3.6-4.98 6.73-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  );
}

export default Auth;
