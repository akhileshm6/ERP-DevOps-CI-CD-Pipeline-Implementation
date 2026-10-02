import React, { useState } from 'react';
import { AlertCircle, LayoutDashboard, LoaderCircle, LogIn } from 'lucide-react';
import { login } from '../../api/authApi';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@erp.local', password: 'Admin123!' },
  { label: 'Manager', email: 'manager@erp.local', password: 'Manager123!' },
  { label: 'User', email: 'user@erp.local', password: 'User123!' }
];

export function LoginForm({ onLogin, notice }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      onLogin?.(result);
    } catch (err) {
      setError(err.status === 401 ? 'Invalid email or password.' : err.message || 'Sign in failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={handleSubmit} aria-labelledby="login-title">
        <div className="brand-section">
          <div className="brand-logo"><LayoutDashboard size={24} /></div>
          <div className="brand-info">
            <h1 id="login-title">ERP Metrics Dashboard</h1>
            <p>Sign in to view your dashboard.</p>
          </div>
        </div>

        {notice && !error && <div className="login-notice" role="status">{notice}</div>}
        {error && <div className="login-error" role="alert"><AlertCircle size={15} aria-hidden="true" /> {error}</div>}

        <label className="login-field">
          <span>Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        <button type="submit" className="btn-primary login-submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <LogIn size={15} aria-hidden="true" />}
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="login-demo">
          <span>Demo accounts</span>
          <div>
            {DEMO_ACCOUNTS.map((account) => (
              <button key={account.label} type="button" className="btn-secondary" onClick={() => { setEmail(account.email); setPassword(account.password); setError(''); }}>
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </main>
  );
}
