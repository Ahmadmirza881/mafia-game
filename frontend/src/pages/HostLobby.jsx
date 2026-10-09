import React, { useState, useEffect, useCallback } from 'react';
import { GameCodeCard } from '../components/GameCodeCard';
import { PlayerList } from '../components/PlayerList';
import { RoleCounter } from '../components/RoleCounter';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

export function HostLobby({ initialGame, hostToken, onExit }) {
  const [game, setGame] = useState(initialGame);
  const [players, setPlayers] = useState([]);
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionResult, setDistributionResult] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Settings adjustment modal/panel state
  const [showSettings, setShowSettings] = useState(false);
  const [editPlayerCount, setEditPlayerCount] = useState(initialGame.required_players);
  const [editRoles, setEditRoles] = useState(initialGame.role_counts || { MAFIA: 1, CITIZEN: 2, DETECTIVE: 1, DOCTOR: 1 });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isClosingGame, setIsClosingGame] = useState(false);

  // Fetch full players list
  const refreshPlayers = useCallback(async () => {
    try {
      const playerList = await api.getPlayers(game.game_code);
      setPlayers(playerList);
    } catch (err) {
      console.warn('Failed to fetch players:', err);
    }
  }, [game.game_code]);

  // Initial load
  useEffect(() => {
    refreshPlayers();
  }, [refreshPlayers]);

  // Keep edit state synced with game updates
  useEffect(() => {
    setEditPlayerCount(game.required_players);
    if (game.role_counts) {
      setEditRoles(game.role_counts);
    }
  }, [game.required_players, game.role_counts]);

  // Handle incoming real-time WebSocket events
  const handleWsMessage = useCallback((data) => {
    if (data.type === 'PLAYER_JOINED') {
      if (data.game) {
        setGame(data.game);
      } else {
        setGame((prev) => ({
          ...prev,
          joined_player_count: data.joined_count,
        }));
      }
      refreshPlayers();
    } else if (data.type === 'GAME_CONFIG_UPDATED') {
      if (data.game) setGame(data.game);
    } else if (data.type === 'DISTRIBUTION_STARTED') {
      setIsDistributing(true);
    } else if (data.type === 'DISTRIBUTION_COMPLETE') {
      setIsDistributing(false);
      setGame((prev) => ({
        ...prev,
        status: 'DISTRIBUTED',
      }));
      setDistributionResult({
        success: true,
        message: `Cards distributed successfully. ${data.total_players} / ${data.total_players} players received cards.`,
      });
      refreshPlayers();
    }
  }, [refreshPlayers]);

  const { isConnected } = useWebSocket(game.game_code, handleWsMessage);

  const joinedCount = players.length;
  const isLobbyFull = joinedCount === game.required_players;
  const isCardsValid = game.total_cards === game.required_players;
  const canDistribute = isLobbyFull && isCardsValid && game.status === 'WAITING' && !isDistributing;

  const handleDistribute = async () => {
    if (!canDistribute) return;

    setError('');
    setIsDistributing(true);

    try {
      const resp = await api.distributeCards(game.game_code, hostToken);
      setDistributionResult(resp);
      setGame((prev) => ({
        ...prev,
        status: 'DISTRIBUTED',
      }));
    } catch (err) {
      setError(err.message || 'Failed to distribute cards.');
      setIsDistributing(false);
    }
  };

  // Close/cancel the game lobby
  const handleCloseGame = async () => {
    if (!window.confirm('Are you sure you want to cancel and close this game lobby? Any joined players will be notified.')) {
      return;
    }

    setIsClosingGame(true);
    setError('');

    try {
      await api.closeGame(game.game_code, hostToken);
      onExit();
    } catch (err) {
      setError(err.message || 'Failed to close game.');
      setIsClosingGame(false);
    }
  };

  // Save adjusted role counts & required players
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const editTotalCards = Object.values(editRoles).reduce((a, b) => a + b, 0);

    if (editTotalCards !== editPlayerCount) {
      setError(`Role cards (${editTotalCards}) must equal required players (${editPlayerCount}).`);
      return;
    }

    if (editPlayerCount < joinedCount) {
      setError(`Cannot set required players (${editPlayerCount}) lower than currently joined players (${joinedCount}).`);
      return;
    }

    setIsSavingSettings(true);
    setError('');

    try {
      const updated = await api.updateRoles(game.game_code, editRoles, editPlayerCount, hostToken);
      setGame(updated);
      setShowSettings(false);
      setSuccessMsg('Game configuration updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update game configuration.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const remainingPlayers = game.required_players - joinedCount;
  const editTotalCards = Object.values(editRoles).reduce((a, b) => a + b, 0);
  const editDiff = editTotalCards - editPlayerCount;

  return (
    <div>
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button type="button" className="back-link" onClick={onExit} style={{ margin: 0 }}>
          ← Exit Lobby
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isConnected ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? 'var(--accent-green)' : 'var(--accent-gold)', display: 'inline-block' }} />
          <span>{isConnected ? 'Realtime Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Distribution Summary / Celebratory View after distribute */}
      {(game.status === 'DISTRIBUTED' || distributionResult) && (
        <div className="card" style={{ textAlign: 'center', border: '1.5px solid var(--accent-green)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
            Cards Distributed
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {distributionResult?.message || `Cards distributed successfully. ${game.required_players} / ${game.required_players} players received cards.`}
          </p>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            Role privacy enforced: Roles are secret and only visible on each individual player's screen.
          </div>
        </div>
      )}

      {/* Responsive Grid Layout: Left Column (Controls & Status), Right Column (Roster & Roles) */}
      <div className="host-lobby-grid">
        {/* LEFT COLUMN: Game Code, Status & Distribute Controls */}
        <div>
          {/* Prominent Game Code with Copy buttons & QR code */}
          <GameCodeCard gameCode={game.game_code} />

          {game.status !== 'DISTRIBUTED' && !distributionResult && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>Lobby Status</span>
                </div>
                <div className={`status-pill ${canDistribute ? 'status-ready' : 'status-waiting'}`}>
                  {canDistribute ? 'Ready to Distribute' : 'Waiting for Players'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-input)', padding: '0.9rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Players Joined
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: '800', marginTop: '0.2rem' }}>
                    {joinedCount} / {game.required_players}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '0.9rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Configured Cards
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: '800', marginTop: '0.2rem' }}>
                    {game.total_cards} / {game.required_players}
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div style={{ marginBottom: '1.25rem' }}>
                {remainingPlayers > 0 ? (
                  <div className="alert alert-warning" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                    <div>
                      <span>Waiting for <strong>{remainingPlayers}</strong> more player{remainingPlayers > 1 ? 's' : ''} to join.</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Want to start with fewer players? Click <strong>Adjust Players & Roles</strong> below to set count to {joinedCount >= 3 ? joinedCount : 3}.
                    </div>
                  </div>
                ) : !isCardsValid ? (
                  <div className="alert alert-error">
                    <span>Role card count ({game.total_cards}) does not match players ({game.required_players}).</span>
                  </div>
                ) : (
                  <div className="alert alert-success">
                    <span>All players joined and cards configured. Ready to distribute.</span>
                  </div>
                )}
              </div>

              {/* Action button */}
              <button
                type="button"
                id="btn-distribute-cards"
                className="btn btn-success"
                style={{ fontSize: '1.05rem', padding: '1.1rem', marginBottom: '0.75rem' }}
                disabled={!canDistribute}
                onClick={handleDistribute}
              >
                <span>{isDistributing ? 'DISTRIBUTING CARDS...' : 'DISTRIBUTE CARDS'}</span>
              </button>

              {/* Host Lobby Controls: Adjust Settings or Cancel Lobby */}
              <div className="host-lobby-actions-grid">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '0.7rem' }}
                  onClick={() => setShowSettings(!showSettings)}
                >
                  {showSettings ? 'Hide Settings' : 'Adjust Players & Roles'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '0.7rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  disabled={isClosingGame}
                  onClick={handleCloseGame}
                >
                  {isClosingGame ? 'Closing...' : 'Cancel Game'}
                </button>
              </div>
            </div>
          )}

          {/* ADJUST SETTINGS PANEL (IF OPENED BY HOST) */}
          {showSettings && game.status === 'WAITING' && (
            <div className="card" style={{ border: '1.5px solid var(--accent-gold)' }}>
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '1.05rem' }}>
                  <span>Adjust Player Count & Roles</span>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}
                  onClick={() => setShowSettings(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSettings}>
                <div className="form-group">
                  <label className="form-label">
                    Required Players (Min: {Math.max(3, joinedCount)})
                  </label>
                  <RoleCounter
                    label="Required Players"
                    value={editPlayerCount}
                    min={Math.max(3, joinedCount)}
                    max={50}
                    onChange={(val) => setEditPlayerCount(val)}
                  />
                  {joinedCount >= 3 && editPlayerCount !== joinedCount && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', marginTop: '0.4rem', width: 'auto' }}
                      onClick={() => setEditPlayerCount(joinedCount)}
                    >
                      Set to joined count ({joinedCount} players)
                    </button>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Adjust Roles (Must sum to {editPlayerCount})</label>
                  
                  <RoleCounter
                    label="Mafia"
                    value={editRoles.MAFIA || 0}
                    min={0}
                    max={editPlayerCount}
                    onChange={(val) => setEditRoles((prev) => ({ ...prev, MAFIA: val }))}
                  />

                  <RoleCounter
                    label="Citizen"
                    value={editRoles.CITIZEN || 0}
                    min={0}
                    max={editPlayerCount}
                    onChange={(val) => setEditRoles((prev) => ({ ...prev, CITIZEN: val }))}
                  />

                  <RoleCounter
                    label="Detective"
                    value={editRoles.DETECTIVE || 0}
                    min={0}
                    max={editPlayerCount}
                    onChange={(val) => setEditRoles((prev) => ({ ...prev, DETECTIVE: val }))}
                  />

                  <RoleCounter
                    label="Doctor"
                    value={editRoles.DOCTOR || 0}
                    min={0}
                    max={editPlayerCount}
                    onChange={(val) => setEditRoles((prev) => ({ ...prev, DOCTOR: val }))}
                  />
                </div>

                {/* In-Editor Validation Message */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cards vs Players:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      {editTotalCards} / {editPlayerCount} Cards
                    </strong>
                  </div>

                  {editDiff < 0 && (
                    <div className="alert alert-warning" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                      <span>{Math.abs(editDiff)} card(s) remaining.</span>
                    </div>
                  )}
                  {editDiff > 0 && (
                    <div className="alert alert-error" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                      <span>Too many cards ({editDiff} over limit).</span>
                    </div>
                  )}
                  {editDiff === 0 && (
                    <div className="alert alert-success" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                      <span>Cards match {editPlayerCount} players.</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={editDiff !== 0 || isSavingSettings}
                  >
                    {isSavingSettings ? 'Saving...' : 'Save & Update Lobby'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSettings(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Player Roster & Configured Roles Breakdown */}
        <div className="host-lobby-sidebar">
          {/* Live Player List */}
          <PlayerList players={players} requiredCount={game.required_players} />

          {/* Role configuration summary */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
              <div className="card-title" style={{ fontSize: '0.95rem' }}>
                <span>Configured Roles Breakdown</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {Object.entries(game.role_counts || {}).map(([role, qty]) => (
                <div
                  key={role}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}
                >
                  <span>{role === 'MAFIA' ? 'Mafia' : role === 'CITIZEN' ? 'Citizen' : role === 'DETECTIVE' ? 'Detective' : 'Doctor'}</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{qty}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
