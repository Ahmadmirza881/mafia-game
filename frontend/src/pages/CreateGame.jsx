import React, { useState } from 'react';
import { RoleCounter } from '../components/RoleCounter';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const ROLE_ICONS = {
  PLAYERS: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  MAFIA: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 4 10.5 4 15.5C4 18.5 6.5 20.5 9.5 19.5V22H14.5V19.5C17.5 20.5 20 18.5 20 15.5C20 10.5 12 2 12 2Z" />
    </svg>
  ),
  CITIZEN: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  DETECTIVE: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7.5" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  ),
  DOCTOR: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 7V17M7 12H17" strokeWidth="2.5" />
    </svg>
  ),
  GODFATHER: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="rgba(245, 158, 11, 0.2)" />
      <circle cx="12" cy="19" r="2" fill="#f59e0b" />
    </svg>
  ),
  JESTER: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12a10 10 0 0 0 20 0c0-6-4-10-10-10S2 6 2 12z" fill="rgba(192, 132, 252, 0.15)" />
      <path d="M8 10h.01M16 10h.01" strokeWidth="3" />
      <path d="M8 15c2 2 6 2 8 0" />
    </svg>
  ),
  MAYOR: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M6 8l6-5 6 5M6 8L3 14h6L6 8zM18 8l-3 6h6l-3-6z" fill="rgba(251, 191, 36, 0.15)" />
    </svg>
  ),
};

export function CreateGame({ onBack, onGameCreated }) {
  // Game Mode Selection: 'CLASSIC' vs 'ELITE'
  const [gameMode, setGameMode] = useState('CLASSIC');

  // Player count & role presets
  const [playerCount, setPlayerCount] = useState(5);
  const [roles, setRoles] = useState({
    MAFIA: 1,
    CITIZEN: 2,
    DETECTIVE: 1,
    DOCTOR: 1,
    GODFATHER: 0,
    JESTER: 0,
    MAYOR: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Switch game mode
  const handleModeSelect = (newMode) => {
    sounds.playClick();
    setGameMode(newMode);
    if (newMode === 'CLASSIC') {
      setPlayerCount(5);
      setRoles({
        MAFIA: 1,
        CITIZEN: 2,
        DETECTIVE: 1,
        DOCTOR: 1,
        GODFATHER: 0,
        JESTER: 0,
        MAYOR: 0,
      });
    } else {
      setPlayerCount(7);
      setRoles({
        MAFIA: 1,
        CITIZEN: 2,
        DETECTIVE: 1,
        DOCTOR: 1,
        GODFATHER: 1,
        JESTER: 1,
        MAYOR: 0,
      });
    }
  };

  const activeRoleKeys = gameMode === 'CLASSIC'
    ? ['MAFIA', 'CITIZEN', 'DETECTIVE', 'DOCTOR']
    : ['MAFIA', 'CITIZEN', 'DETECTIVE', 'DOCTOR', 'GODFATHER', 'JESTER', 'MAYOR'];

  const totalCards = activeRoleKeys.reduce((acc, key) => acc + (roles[key] || 0), 0);
  const cardsDiff = totalCards - playerCount;
  const isValidCards = cardsDiff === 0;

  const handleRoleChange = (roleKey, newQty) => {
    setRoles((prev) => ({
      ...prev,
      [roleKey]: Math.max(0, newQty),
    }));
  };

  const handleCreateGameSubmit = async (e) => {
    e.preventDefault();
    if (!isValidCards) return;

    setError('');
    setLoading(true);

    try {
      // Send only relevant role keys for the active mode
      const rolesPayload = {};
      activeRoleKeys.forEach((k) => {
        rolesPayload[k] = roles[k] || 0;
      });

      const resp = await api.createGame(playerCount, rolesPayload, null, null, gameMode);
      onGameCreated(resp.game, resp.host_token);
    } catch (err) {
      setError(err.message || 'Failed to create game.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="back-link"
        onClick={onBack}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Home</span>
      </button>

      {/* Mode Selection Cards Header */}
      <div className="mode-selection-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '0.04em' }}>
            Choose Your Game Mode
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Select either the traditional Mafia Classic or the expanded Mafia Elite experience.
          </p>
        </div>

        <div className="mode-selector-grid">
          {/* Card 1: Mafia Classic */}
          <div
            className={`mode-card mode-card-classic ${gameMode === 'CLASSIC' ? 'is-active' : ''}`}
            onClick={() => handleModeSelect('CLASSIC')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleModeSelect('CLASSIC')}
          >
            <div className="mode-card-badge classic-badge">TRADITIONAL 4 ROLES</div>
            <div className="mode-card-header">
              <span className="mode-card-icon">♠</span>
              <h3 className="mode-card-title">Mafia Classic</h3>
            </div>
            <p className="mode-card-desc">
              The original tabletop social deduction game. 4 core roles, gritty noir artwork, pure psychological gameplay.
            </p>
            <div className="mode-card-roles-list">
              <span>Mafia</span> • <span>Civilian</span> • <span>Detective</span> • <span>Doctor</span>
            </div>
            <div className="mode-select-indicator">
              <span className="indicator-dot" />
              <span>{gameMode === 'CLASSIC' ? 'Selected Mode' : 'Click to Select'}</span>
            </div>
          </div>

          {/* Card 2: Mafia Elite */}
          <div
            className={`mode-card mode-card-elite ${gameMode === 'ELITE' ? 'is-active' : ''}`}
            onClick={() => handleModeSelect('ELITE')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleModeSelect('ELITE')}
          >
            <div className="mode-card-badge elite-badge">👑 7 ROLES EXPANSION</div>
            <div className="mode-card-header">
              <span className="mode-card-icon elite-gold-icon">👑</span>
              <h3 className="mode-card-title elite-gold-title">Mafia Elite</h3>
            </div>
            <p className="mode-card-desc">
              Expanded syndicate edition. Features The Godfather (immune to Detective), The Jester (wins if voted out), and The Mayor (2x votes).
            </p>
            <div className="mode-card-roles-list">
              <span>+ Godfather</span> • <span>+ Jester</span> • <span>+ Mayor</span> • <span>+ 4 Core</span>
            </div>
            <div className="mode-select-indicator">
              <span className="indicator-dot" />
              <span>{gameMode === 'ELITE' ? 'Selected Mode' : 'Click to Select'}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCreateGameSubmit}>
        <div className="create-game-grid">
          {/* LEFT COLUMN: Player Count Card */}
          <div>
            <div className={`card ${gameMode === 'ELITE' ? 'card-elite-border' : ''}`}>
              <div className="card-header">
                <div className="card-title">
                  <span>Player Count</span>
                </div>
                <span className={gameMode === 'ELITE' ? 'mode-pill-elite' : 'mode-pill-classic'}>
                  {gameMode === 'ELITE' ? '👑 MAFIA ELITE' : 'MAFIA CLASSIC'}
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Total Required Players</label>
                <RoleCounter
                  label="Players"
                  icon={ROLE_ICONS.PLAYERS}
                  value={playerCount}
                  min={3}
                  max={50}
                  onChange={(val) => setPlayerCount(val)}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                  {gameMode === 'ELITE'
                    ? 'Recommended 6-12 players for full Mafia Elite expansion mechanics.'
                    : 'Configure total players participating (Min: 3, Max: 50).'}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Role Distribution Steppers & Validation Action */}
          <div className={`card ${gameMode === 'ELITE' ? 'card-elite-border' : ''}`}>
            <div className="card-header">
              <div className="card-title">
                <span>{gameMode === 'ELITE' ? 'Elite Role Distribution' : 'Role Distribution'}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {totalCards} / {playerCount} Cards
              </div>
            </div>

            <div className="form-group">
              {/* CORE ROLES (Both Classic & Elite) */}
              <RoleCounter
                label="Mafia"
                icon={ROLE_ICONS.MAFIA}
                value={roles.MAFIA}
                min={0}
                max={playerCount}
                onChange={(val) => handleRoleChange('MAFIA', val)}
              />

              <RoleCounter
                label="Civilian"
                icon={ROLE_ICONS.CITIZEN}
                value={roles.CITIZEN}
                min={0}
                max={playerCount}
                onChange={(val) => handleRoleChange('CITIZEN', val)}
              />

              <RoleCounter
                label="Detective"
                icon={ROLE_ICONS.DETECTIVE}
                value={roles.DETECTIVE}
                min={0}
                max={playerCount}
                onChange={(val) => handleRoleChange('DETECTIVE', val)}
              />

              <RoleCounter
                label="Doctor"
                icon={ROLE_ICONS.DOCTOR}
                value={roles.DOCTOR}
                min={0}
                max={playerCount}
                onChange={(val) => handleRoleChange('DOCTOR', val)}
              />

              {/* ELITE EXCLUSIVE ROLES (Only in Mafia Elite) */}
              {gameMode === 'ELITE' && (
                <>
                  <div className="elite-roles-divider">
                    <span>👑 MAFIA ELITE EXPANSION ROLES</span>
                  </div>

                  <div className="role-counter-with-desc">
                    <RoleCounter
                      label="Godfather (Don)"
                      icon={ROLE_ICONS.GODFATHER}
                      value={roles.GODFATHER}
                      min={0}
                      max={playerCount}
                      onChange={(val) => handleRoleChange('GODFATHER', val)}
                    />
                    <div className="role-rule-hint gold-hint">
                      👑 Leader of the Mafia. Appears Innocent if investigated by Detective!
                    </div>
                  </div>

                  <div className="role-counter-with-desc">
                    <RoleCounter
                      label="Jester (Fool)"
                      icon={ROLE_ICONS.JESTER}
                      value={roles.JESTER}
                      min={0}
                      max={playerCount}
                      onChange={(val) => handleRoleChange('JESTER', val)}
                    />
                    <div className="role-rule-hint purple-hint">
                      🎭 Independent. Wins solo if voted out by town! (Does not win if killed at night).
                    </div>
                  </div>

                  <div className="role-counter-with-desc">
                    <RoleCounter
                      label="Mayor"
                      icon={ROLE_ICONS.MAYOR}
                      value={roles.MAYOR}
                      min={0}
                      max={playerCount}
                      onChange={(val) => handleRoleChange('MAYOR', val)}
                    />
                    <div className="role-rule-hint amber-hint">
                      ⚖ Town Leader. Vote carries double weight (counts as 2 votes)!
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Validation Feedback Banner */}
            <div style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
              {cardsDiff < 0 && (
                <div className="alert alert-warning">
                  <span>{Math.abs(cardsDiff)} card(s) remaining. Add more roles to match {playerCount} players.</span>
                </div>
              )}

              {cardsDiff > 0 && (
                <div className="alert alert-error">
                  <span>Too many cards configured! Remove {cardsDiff} card(s).</span>
                </div>
              )}

              {cardsDiff === 0 && (
                <div className="alert alert-success">
                  <span>Total cards match {playerCount} players. Ready to launch {gameMode === 'ELITE' ? 'Mafia Elite' : 'Mafia Classic'}.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              id="btn-submit-create-game"
              className={gameMode === 'ELITE' ? 'btn-create-game-elite' : 'btn btn-primary'}
              disabled={!isValidCards || loading}
              style={{ padding: '1.05rem', fontSize: '1.05rem', width: '100%' }}
            >
              <span className="btn-icon" style={{ display: 'flex', alignItems: 'center' }}>
                {gameMode === 'ELITE' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="rgba(245, 158, 11, 0.2)" />
                    <circle cx="12" cy="19" r="2" fill="#f59e0b" />
                  </svg>
                ) : (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                )}
              </span>
              <span>
                {loading
                  ? 'Creating Game Lobby...'
                  : gameMode === 'ELITE'
                  ? 'CREATE MAFIA ELITE LOBBY'
                  : 'CREATE MAFIA CLASSIC LOBBY'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
