import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function JoinGame({ onBack, onJoined, defaultGameCode = '' }) {
  const [gameCode, setGameCode] = useState(defaultGameCode);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultGameCode) {
      setGameCode(defaultGameCode.toUpperCase());
    }
  }, [defaultGameCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = gameCode.trim().toUpperCase();
    const cleanName = playerName.trim();

    if (!cleanCode) {
      setError('Please enter a Game Code.');
      return;
    }

    if (!cleanName) {
      setError('Please enter your Player Name.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const resp = await api.joinGame(cleanCode, cleanName);
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
        ← Back to Home
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
            <label className="form-label" htmlFor="input-game-code">Game Code</label>
            <input
              id="input-game-code"
              type="text"
              className="input-text input-code"
              placeholder="MAFIA-XXXX"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoFocus={!defaultGameCode}
              maxLength={15}
            />
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
            />
          </div>

          <button
            type="submit"
            id="btn-submit-join"
            className="btn btn-primary"
            style={{ marginTop: '0.5rem', padding: '1.05rem' }}
            disabled={loading}
          >
            {loading ? 'Joining Game...' : 'JOIN GAME'}
          </button>
        </form>
      </div>
    </div>
  );
}
