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
        ← Back to Home
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
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '0.75rem', padding: '1.05rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'ENTER AS HOST'}
          </button>
        </form>
      </div>
    </div>
  );
}
