import React, { useState, useEffect, useCallback } from 'react';
import { PlayerList } from '../components/PlayerList';
import { SecretRoleCard } from '../components/SecretRoleCard';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export function PlayerScreen({ initialGame, playerName, sessionToken, onLeave }) {
  const [game, setGame] = useState(initialGame);
  const [players, setPlayers] = useState([]);
  const [roleInfo, setRoleInfo] = useState(null);
  const [loadingRole, setLoadingRole] = useState(false);
  const [isGameClosed, setIsGameClosed] = useState(false);
  const [error, setError] = useState('');

  // Fetch public player list (names only, no roles!)
  const refreshPlayers = useCallback(async () => {
    try {
      const list = await api.getPlayers(game.game_code);
      setPlayers(list);
    } catch (err) {
      console.warn('Failed to load players:', err);
    }
  }, [game.game_code]);

  // Fetch my own secret role using session token
  const fetchMyRole = useCallback(async () => {
    setLoadingRole(true);
    setError('');
    try {
      const myRole = await api.getMyRole(sessionToken);
      setRoleInfo(myRole);
    } catch (err) {
      setError(err.message || 'Failed to fetch assigned role.');
    } finally {
      setLoadingRole(false);
    }
  }, [sessionToken]);

  // On mount: fetch players list; if game is already distributed, fetch role immediately!
  useEffect(() => {
    refreshPlayers();
    if (game.status === 'DISTRIBUTED') {
      fetchMyRole();
    }
  }, [game.status, fetchMyRole, refreshPlayers]);

  // Handle real-time WebSocket events
  const handleWsMessage = useCallback((data) => {
    if (data.type === 'PLAYER_JOINED') {
      if (data.game) setGame(data.game);
      refreshPlayers();
    } else if (data.type === 'GAME_CONFIG_UPDATED') {
      if (data.game) setGame(data.game);
    } else if (data.type === 'GAME_CLOSED') {
      setIsGameClosed(true);
      setError(data.message || 'The host has cancelled and closed this game lobby.');
    } else if (data.type === 'DISTRIBUTION_STARTED') {
      // Host initiated distribution
      setGame((prev) => ({ ...prev, status: 'DISTRIBUTING' }));
    } else if (data.type === 'DISTRIBUTION_COMPLETE') {
      // Distribution complete! Now fetch our own secret role
      setGame((prev) => ({ ...prev, status: 'DISTRIBUTED' }));
      fetchMyRole();
    }
  }, [fetchMyRole, refreshPlayers]);

  const { isConnected } = useWebSocket(game.game_code, handleWsMessage);

  if (isGameClosed) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.5rem', color: '#f87171' }}>
          Game Lobby Closed
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {error || 'The host has cancelled and closed this game lobby.'}
        </p>
        <button type="button" className="btn btn-secondary" onClick={onLeave}>
          ← Return to Home
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', maxWidth: game.status !== 'DISTRIBUTED' ? '520px' : '100%', margin: game.status !== 'DISTRIBUTED' ? '0 auto 1rem auto' : '0 0 1rem 0' }}>
        <button type="button" className="back-link" onClick={onLeave} style={{ margin: 0 }}>
          ← Leave Game
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isConnected ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? 'var(--accent-green)' : 'var(--accent-gold)', display: 'inline-block' }} />
          <span>{isConnected ? 'Realtime Live' : 'Connecting...'}</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ maxWidth: game.status !== 'DISTRIBUTED' ? '520px' : '100%', margin: game.status !== 'DISTRIBUTED' ? '0 auto 1.25rem auto' : '0 0 1.25rem 0' }}>
          <span>{error}</span>
        </div>
      )}

      {/* BEFORE DISTRIBUTION - Clean Centered Layout */}
      {game.status !== 'DISTRIBUTED' && (
        <div className="centered-container">
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Game: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{game.game_code}</strong>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>
              Welcome, {playerName}
            </div>

            <div style={{ margin: '1.5rem 0' }}>
              <div className="pulse-spinner" style={{ width: 42, height: 42, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-gold)' }}>
                {game.status === 'DISTRIBUTING' ? 'Distributing Secret Cards...' : 'Waiting for Host...'}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: '280px', margin: '0.5rem auto 0 auto' }}>
                Your secret role will appear automatically when the Host distributes the cards.
              </p>
            </div>

            <div className="status-pill status-waiting" style={{ marginTop: '0.75rem' }}>
              {players.length} / {game.required_players} Players Joined
            </div>
          </div>

          {/* Joined players list in waiting room */}
          <PlayerList players={players} requiredCount={game.required_players} currentUserName={playerName} />
        </div>
      )}

      {/* AFTER DISTRIBUTION - Responsive Grid (2-column on laptop, 1-column on mobile) */}
      {game.status === 'DISTRIBUTED' && (
        <div className="player-distributed-grid">
          <div>
            {loadingRole && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div className="pulse-spinner" />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  Decrypting your secret card...
                </div>
              </div>
            )}

            {roleInfo && <SecretRoleCard roleInfo={roleInfo} />}
          </div>

          <div>
            <PlayerList players={players} requiredCount={game.required_players} currentUserName={playerName} />
          </div>
        </div>
      )}
    </div>
  );
}
