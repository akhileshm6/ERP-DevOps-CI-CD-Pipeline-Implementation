import React, { useState } from 'react';
import { login } from '../../api/authApi';
import { useStatus } from '../../hooks/useStatus';
import { Spinner } from '../common/WidgetStates';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@erp.local', password: 'Admin123!' },
  { label: 'Manager', email: 'manager@erp.local', password: 'Manager123!' },
  { label: 'Employee', email: 'user@erp.local', password: 'User123!' }
];

export function LoginForm({ onLogin, notice }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statusQuery = useStatus();
  const isDemo = statusQuery.data?.dataSource === 'demo';

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
      <form className="login-form" onSubmit={handleSubmit} aria-labelledby="login-title" noValidate={false}>
        <h1 id="login-title" className="login-title">SP301 ERP</h1>
        <p className="text-secondary">Sign in with your work account.</p>

        {notice && !error && <p className="message message-info" role="status">{notice}</p>}
        {error && <p className="message message-error" role="alert">{error}</p>}

        <label className="field">
          <span className="field-label">Email</span>
          <input className="input" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        {isDemo && (
          <div className="login-demo" role="group" aria-labelledby="demo-accounts-label">
            <span id="demo-accounts-label" className="field-label">Demo accounts</span>
            <div className="login-demo-buttons">
              {DEMO_ACCOUNTS.map((account) => (
                <button key={account.label} type="button" className="btn btn-small" aria-label={`Fill ${account.label} demo account`} onClick={() => { setEmail(account.email); setPassword(account.password); setError(''); }}>
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
