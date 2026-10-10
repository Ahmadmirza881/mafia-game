import React, { useState } from 'react';
import { api } from '../services/api';

export function HostLogin({ onBack, onHostLoggedIn }) {
  const [gameCode, setGameCode] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = gameCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter your Game Code.');
      return;
    }
    if (!hostPassword.trim()) {
      setError('Please enter your Host Password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const resp = await api.hostLogin(cleanCode, hostEmail, hostPassword);
      onHostLoggedIn(resp.game, resp.host_token);
    } catch (err) {
      setError(err.message || 'Invalid host credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="centered-container">
      <button type="button" className="back-link" onClick={onBack}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Home</span>
      </button>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <span>Host Login</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="input-login-game-code">Game Code</label>
            <input
              id="input-login-game-code"
              type="text"
              className="input-text input-code"
              placeholder="MAFIA-XXXX"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoFocus
              maxLength={15}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-login-email">Host Email / ID (If configured)</label>
            <input
              id="input-login-email"
              type="text"
              className="input-text"
              placeholder="admin@mafia"
              value={hostEmail}
              onChange={(e) => setHostEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-login-password">Host Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                className="input-text"
                placeholder="Enter host password"
                value={hostPassword}
                onChange={(e) => setHostPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: '3.8rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                aria-label="Toggle password visibility"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '0.75rem', padding: '1.05rem' }}
            disabled={loading}
          >
            <span className="btn-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <span>{loading ? 'Authenticating...' : 'ENTER AS HOST'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
