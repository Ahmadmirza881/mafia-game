import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function JoinGame({ onBack, onJoined, defaultGameCode = '' }) {
  // Helper to extract just the suffix part after MAFIA-
  const extractSuffix = (code) => {
    if (!code) return '';
    return code.toUpperCase().replace(/^MAFIA-?/, '').trim();
  };

  const [codeSuffix, setCodeSuffix] = useState(() => extractSuffix(defaultGameCode));
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultGameCode) {
      setCodeSuffix(extractSuffix(defaultGameCode));
    }
  }, [defaultGameCode]);

  const handleCodeChange = (e) => {
    const raw = e.target.value;
    // Strip MAFIA- prefix if pasted or typed by user
    const cleaned = raw.toUpperCase().replace(/^MAFIA-?/, '').trim();
    setCodeSuffix(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanSuffix = codeSuffix.trim().toUpperCase();
    const cleanName = playerName.trim();

    if (!cleanSuffix) {
      setError('Please enter the Game Code numbers.');
      return;
    }

    if (!cleanName) {
      setError('Please enter your Player Name.');
      return;
    }

    const fullCode = `MAFIA-${cleanSuffix}`;
    setError('');
    setLoading(true);

    try {
      const resp = await api.joinGame(fullCode, cleanName);
      onJoined({
        game: resp.game,
        playerName: resp.player_name,
        sessionToken: resp.session_token,
      });
    } catch (err) {
      setError(err.message || 'Failed to join game.');
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
            <span>Join Mafia Game</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="input-game-code-suffix">Game Code</label>
            <div className="game-code-input-group">
              <span className="game-code-prefix">MAFIA -</span>
              <input
                id="input-game-code-suffix"
                type="text"
                className="input-text input-code-suffix"
                placeholder="XXXX"
                value={codeSuffix}
                onChange={handleCodeChange}
                autoComplete="off"
                autoFocus={!defaultGameCode}
                maxLength={8}
                required
              />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.45rem' }}>
              Only enter the code digits (e.g. 1234).
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-player-name">Player Name</label>
            <input
              id="input-player-name"
              type="text"
              className="input-text"
              placeholder="e.g. Ali"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              autoComplete="off"
              autoFocus={!!defaultGameCode}
              maxLength={40}
              required
            />
          </div>

          <button
            type="submit"
            id="btn-submit-join"
            className="btn btn-primary"
            style={{ marginTop: '0.5rem', padding: '1.05rem' }}
            disabled={loading}
          >
            <span className="btn-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2" />
                <line x1="2" y1="9" x2="22" y2="9" />
              </svg>
            </span>
            <span>{loading ? 'Joining Game...' : 'JOIN GAME'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
