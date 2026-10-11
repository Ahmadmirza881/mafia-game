import React, { useState } from 'react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const ROLE_DEFINITIONS = {
  MAFIA: {
    key: 'MAFIA',
    name: 'Mafia',
    alignment: 'Syndicate • Evil',
    actionType: 'Night Elimination',
    accentColor: '#ef4444',
    bgClass: 'role-item-mafia',
    description: 'Wakes up secretly during the Night Phase with syndicate partners to choose and eliminate one player. Blends in with civilians during the Day.',
    winCondition: 'Outnumber or equal the living Town citizens.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444">
        <path d="M12 2C12 2 4 10.5 4 15.5C4 18.5 6.5 20.5 9.5 19.5V22H14.5V19.5C17.5 20.5 20 18.5 20 15.5C20 10.5 12 2 12 2Z" />
      </svg>
    ),
  },
  CITIZEN: {
    key: 'CITIZEN',
    name: 'Civilian',
    alignment: 'Town Citizens • Good',
    actionType: 'Day Trial Vote',
    accentColor: '#64748b',
    bgClass: 'role-item-civilian',
    description: 'Has no special night abilities. Uses sharp observation, behavioral deduction, and town trial discussions to expose and vote out Mafia members.',
    winCondition: 'Eliminate every member of the Mafia syndicate.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  DETECTIVE: {
    key: 'DETECTIVE',
    name: 'Detective',
    alignment: 'Town Investigative',
    actionType: 'Night Investigation',
    accentColor: '#38bdf8',
    bgClass: 'role-item-detective',
    description: 'Investigates one suspect every night to discover their secret identity (Guilty or Innocent). Must guide the town without getting killed.',
    winCondition: 'Discover the Mafia members and guide the town to eliminate them.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7.5" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
    ),
  },
  DOCTOR: {
    key: 'DOCTOR',
    name: 'Doctor',
    alignment: 'Town Protective',
    actionType: 'Night Protection',
    accentColor: '#10b981',
    bgClass: 'role-item-doctor',
    description: 'Selects one player each night to protect from murder. If the Mafia targets that protected player, the attack fails and nobody dies.',
    winCondition: 'Keep key town roles alive and eliminate all Mafia members.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M12 7V17M7 12H17" strokeWidth="2.5" />
      </svg>
    ),
  },
  GODFATHER: {
    key: 'GODFATHER',
    name: 'Godfather (Don)',
    alignment: 'Syndicate Leader',
    actionType: 'Investigation Immune',
    accentColor: '#f59e0b',
    bgClass: 'role-item-godfather',
    description: 'The supreme boss of the syndicate. Appears completely Innocent if investigated by the Detective. Holds commanding priority over night eliminations.',
    winCondition: 'Lead the Mafia syndicate to overwhelm the Town.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="rgba(245, 158, 11, 0.2)" />
        <circle cx="12" cy="19" r="2" fill="#f59e0b" />
      </svg>
    ),
  },
  JESTER: {
    key: 'JESTER',
    name: 'Jester (Fool)',
    alignment: 'Chaos • Independent',
    actionType: 'Passive Trickster',
    accentColor: '#c084fc',
    bgClass: 'role-item-jester',
    description: 'A rogue chaos agent aligned with neither team. Acts erratic, suspicious, and provocative to trick the town into voting them out during the Day trial.',
    winCondition: 'Wins solo instantly if eliminated by town vote! (Does not win if killed at night).',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12a10 10 0 0 0 20 0c0-6-4-10-10-10S2 6 2 12z" fill="rgba(192, 132, 252, 0.15)" />
        <path d="M8 10h.01M16 10h.01" strokeWidth="3" />
        <path d="M8 15c2 2 6 2 8 0" />
      </svg>
    ),
  },
  MAYOR: {
    key: 'MAYOR',
    name: 'Mayor',
    alignment: 'Town Leadership',
    actionType: 'Double Vote (2x)',
    accentColor: '#fbbf24',
    bgClass: 'role-item-mayor',
    description: 'The elected town leader. During daytime trials, the Mayor\'s vote carries double the standard weight (counts as 2 votes), allowing them to break crucial ties.',
    winCondition: 'Unite town citizens and eliminate the Mafia syndicate.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M6 8l6-5 6 5M6 8L3 14h6L6 8zM18 8l-3 6h6l-3-6z" fill="rgba(251, 191, 36, 0.15)" />
      </svg>
    ),
  },
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

  // Accordion state to toggle dropdown details for each role
  const [expandedRoles, setExpandedRoles] = useState({});

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

  // Syndicate vs Town count metrics for the balance meter
  const mafiaCount = (roles.MAFIA || 0) + (roles.GODFATHER || 0);
  const townCount = (roles.CITIZEN || 0) + (roles.DETECTIVE || 0) + (roles.DOCTOR || 0) + (roles.MAYOR || 0);
  const neutralCount = (roles.JESTER || 0);

  const handleRoleChange = (roleKey, newQty) => {
    setRoles((prev) => ({
      ...prev,
      [roleKey]: Math.max(0, newQty),
    }));
  };

  // Toggle role dropdown detail accordion
  const toggleRoleExpand = (roleKey) => {
    sounds.playClick();
    setExpandedRoles((prev) => ({
      ...prev,
      [roleKey]: !prev[roleKey],
    }));
  };

  const handleCreateGameSubmit = async (e) => {
    e.preventDefault();
    if (!isValidCards) return;

    setError('');
    setLoading(true);

    try {
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
    <div className="create-game-page">
      {/* Top Bar with Back Pill on Left & Centered Brand Logo */}
      <div className="create-page-topbar">
        <button
          type="button"
          className="btn-back-pill"
          onClick={onBack}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back to Home</span>
        </button>

        <div className="topbar-logo-group">
          <div className="topbar-logo-slit" />
          <h1 className="topbar-logo-title">MAFIA</h1>
          <span className="topbar-logo-subtitle">CARD GAME</span>
        </div>

        <div className="topbar-spacer" />
      </div>

      {/* Centered Heading */}
      <div className="create-page-heading-section">
        <h2 className="create-page-heading-title">Choose Your Game Mode</h2>
        <p className="create-page-heading-subtitle">
          Select either the traditional Mafia Classic or the expanded Mafia Elite experience.
        </p>
      </div>

      <form onSubmit={handleCreateGameSubmit}>
        {/* 2x2 Grid matching reference image */}
        <div className="create-game-2x2-grid">
          {/* Top-Left: Mafia Classic Mode Card */}
          <div
            className={`create-mode-card classic ${gameMode === 'CLASSIC' ? 'is-selected' : ''}`}
            onClick={() => handleModeSelect('CLASSIC')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleModeSelect('CLASSIC')}
          >
            <div className="mode-card-badge-pill classic-pill">TRADITIONAL 4 ROLES</div>
            <h3 className="mode-card-hero-title">Mafia Classic</h3>
            <p className="mode-card-hero-desc">
              The original tabletop social deduction game. 4 core roles, gritty noir artwork, pure psychological gameplay.
            </p>
            <div className="mode-card-roles-summary">
              Mafia • Civilian • Detective • Doctor
            </div>
            <div className={`mode-card-cta-pill ${gameMode === 'CLASSIC' ? 'cta-selected' : 'cta-unselected'}`}>
              {gameMode === 'CLASSIC' ? (
                <>
                  <span className="cta-check-circle">✓</span>
                  <span>Selected Mode</span>
                </>
              ) : (
                <>
                  <span>Click to Select</span>
                  <span className="cta-arrow">→</span>
                </>
              )}
            </div>
          </div>

          {/* Top-Right: Mafia Elite Mode Card */}
          <div
            className={`create-mode-card elite ${gameMode === 'ELITE' ? 'is-selected' : ''}`}
            onClick={() => handleModeSelect('ELITE')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleModeSelect('ELITE')}
          >
            <div className="mode-card-badge-pill elite-pill">7 ROLES EXPANSION</div>
            <h3 className="mode-card-hero-title">Mafia Elite</h3>
            <p className="mode-card-hero-desc">
              Expanded syndicate edition. Features The Godfather (immune to Detective), The Jester (wins if voted out), and The Mayor (2x votes).
            </p>
            <div className="mode-card-roles-summary">
              Godfather • Jester • Mayor • 4 Core
            </div>
            <div className={`mode-card-cta-pill ${gameMode === 'ELITE' ? 'cta-selected' : 'cta-unselected'}`}>
              {gameMode === 'ELITE' ? (
                <>
                  <span className="cta-check-circle elite">✓</span>
                  <span>Selected Mode</span>
                </>
              ) : (
                <>
                  <span>Click to Select</span>
                  <span className="cta-arrow">→</span>
                </>
              )}
            </div>
          </div>

          {/* Bottom-Left: Player Count & Team Balance Card (Eliminating empty space) */}
          <div className="create-config-card player-count-card">
            <div className="config-card-header">
              <h3 className="config-card-title">Player Count</h3>
              <span className={`config-mode-badge ${gameMode === 'ELITE' ? 'elite' : 'classic'}`}>
                {gameMode === 'ELITE' ? 'MAFIA ELITE' : 'MAFIA CLASSIC'}
              </span>
            </div>

            {/* Stepper Box */}
            <div className="config-section-block">
              <div className="config-card-sublabel">TOTAL REQUIRED PLAYERS</div>
              <div className="stepper-row-box">
                <div className="stepper-label-group">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="stepper-label-text">Players</span>
                </div>

                <div className="stepper-controls-group">
                  <button
                    type="button"
                    className="stepper-btn btn-dec"
                    onClick={() => { sounds.playClick(); setPlayerCount(Math.max(3, playerCount - 1)); }}
                    disabled={playerCount <= 3}
                    aria-label="Decrease player count"
                  >
                    -
                  </button>
                  <span className="stepper-val-text">{playerCount}</span>
                  <button
                    type="button"
                    className="stepper-btn btn-inc"
                    onClick={() => { sounds.playClick(); setPlayerCount(Math.min(50, playerCount + 1)); }}
                    disabled={playerCount >= 50}
                    aria-label="Increase player count"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Presets Row */}
            <div className="config-section-block">
              <div className="presets-label-row">
                <span className="config-card-sublabel">QUICK PRESETS</span>
                <span className="presets-hint">Click to set</span>
              </div>
              <div className="presets-pill-group">
                {[5, 6, 7, 8, 10, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`preset-pill-btn ${playerCount === num ? 'is-active' : ''}`}
                    onClick={() => { sounds.playClick(); setPlayerCount(num); }}
                  >
                    {num}P
                  </button>
                ))}
              </div>
            </div>

            {/* Syndicate Ratio & Balance Widget */}
            <div className="team-balance-card">
              <div className="team-balance-header">
                <span className="balance-title">SYNDICATE RATIO & BALANCE</span>
                <span className="balance-count">{playerCount} Total</span>
              </div>

              <div className="balance-metrics-grid">
                <div className="balance-metric-item mafia">
                  <span className="metric-dot mafia" />
                  <span className="metric-label">Mafia:</span>
                  <span className="metric-num">{mafiaCount}</span>
                </div>
                <div className="balance-metric-item town">
                  <span className="metric-dot town" />
                  <span className="metric-label">Town:</span>
                  <span className="metric-num">{townCount}</span>
                </div>
                {gameMode === 'ELITE' && (
                  <div className="balance-metric-item neutral">
                    <span className="metric-dot neutral" />
                    <span className="metric-label">Neutral:</span>
                    <span className="metric-num">{neutralCount}</span>
                  </div>
                )}
              </div>

              {/* Proportional Alliance Bar */}
              <div className="balance-ratio-bar">
                <div
                  className="ratio-segment mafia"
                  style={{ width: `${Math.max(8, (mafiaCount / Math.max(1, totalCards)) * 100)}%` }}
                  title={`Mafia Team: ${mafiaCount}`}
                />
                <div
                  className="ratio-segment town"
                  style={{ width: `${Math.max(8, (townCount / Math.max(1, totalCards)) * 100)}%` }}
                  title={`Town Citizens: ${townCount}`}
                />
                {gameMode === 'ELITE' && neutralCount > 0 && (
                  <div
                    className="ratio-segment neutral"
                    style={{ width: `${Math.max(8, (neutralCount / Math.max(1, totalCards)) * 100)}%` }}
                    title={`Neutral Chaos: ${neutralCount}`}
                  />
                )}
              </div>
            </div>

            {/* Mode Intel Box */}
            <div className="mode-intel-box">
              <div className="intel-header">
                <span className="intel-icon">{gameMode === 'ELITE' ? '👑' : '♠'}</span>
                <span className="intel-title">{gameMode === 'ELITE' ? 'Mafia Elite Syndicate Rules' : 'Mafia Classic Tabletop Rules'}</span>
              </div>
              <p className="intel-desc">
                {gameMode === 'ELITE'
                  ? 'Includes Godfather inspection immunity, Jester solo-win chaos, and Mayor 2x voting leverage. Recommended 6–12 players.'
                  : 'Traditional 4-role social deduction. Focuses on pure psychology, body language, and bluffing. Recommended 5–8 players.'}
              </p>
            </div>

            <div className="config-footer-note">
              {gameMode === 'ELITE'
                ? 'Recommended 6-12 players for full Mafia Elite expansion mechanics.'
                : 'Configure total players participating (Min: 3, Max: 50).'}
            </div>
          </div>

          {/* Bottom-Right: Role Distribution Card with Dropdown Details on Each Role */}
          <div className="create-config-card role-dist-card">
            <div className="config-card-header">
              <h3 className="config-card-title">Role Distribution</h3>
              <span className="config-counter-badge">{totalCards} / {playerCount} Cards</span>
            </div>

            <div className="role-rows-stack">
              {activeRoleKeys.map((roleKey) => {
                const def = ROLE_DEFINITIONS[roleKey];
                const count = roles[roleKey] || 0;
                const isExpanded = !!expandedRoles[roleKey];

                return (
                  <div key={roleKey} className={`role-row-wrapper ${def.bgClass}`}>
                    {/* Main Row Header */}
                    <div className="role-row-item">
                      <div className="role-row-info">
                        <span className={`role-row-icon ${roleKey.toLowerCase()}`}>
                          {def.icon}
                        </span>
                        <span className="role-row-name">{def.name}</span>

                        {/* Dropdown Arrow Button to explain role detail */}
                        <button
                          type="button"
                          className={`role-dropdown-btn ${isExpanded ? 'is-active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRoleExpand(roleKey);
                          }}
                          aria-label={`Explain ${def.name} details`}
                          title={isExpanded ? `Hide ${def.name} details` : `Explain ${def.name} powers & rules`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>

                      <div className="stepper-controls-group">
                        <button
                          type="button"
                          className="stepper-btn-sm"
                          onClick={() => { sounds.playClick(); handleRoleChange(roleKey, count - 1); }}
                          disabled={count <= 0}
                          aria-label={`Decrease ${def.name}`}
                        >
                          -
                        </button>
                        <span className="stepper-val-sm">{count}</span>
                        <button
                          type="button"
                          className="stepper-btn-sm"
                          onClick={() => { sounds.playClick(); handleRoleChange(roleKey, count + 1); }}
                          disabled={count >= playerCount}
                          aria-label={`Increase ${def.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Expandable Dropdown Drawer Explaining Role Details */}
                    {isExpanded && (
                      <div className="role-details-drawer">
                        <div className="drawer-tags-row">
                          <span
                            className="drawer-badge alignment"
                            style={{
                              color: def.accentColor,
                              borderColor: `${def.accentColor}66`,
                              backgroundColor: `${def.accentColor}18`,
                            }}
                          >
                            {def.alignment}
                          </span>
                          <span className="drawer-badge action">
                            {def.actionType}
                          </span>
                        </div>

                        <p className="drawer-desc">{def.description}</p>

                        <div className="drawer-win-row">
                          <span className="win-badge">WIN CONDITION</span>
                          <span className="win-text">{def.winCondition}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Submit Action Bar */}
        <div className="create-submit-bar">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span>{error}</span>
            </div>
          )}

          {cardsDiff < 0 && (
            <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
              <span>{Math.abs(cardsDiff)} card(s) remaining. Add more roles to match {playerCount} players.</span>
            </div>
          )}

          {cardsDiff > 0 && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <span>Too many cards configured! Remove {cardsDiff} card(s).</span>
            </div>
          )}

          {cardsDiff === 0 && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              <span>Total cards match {playerCount} players. Ready to launch {gameMode === 'ELITE' ? 'Mafia Elite' : 'Mafia Classic'}.</span>
            </div>
          )}

          <button
            type="submit"
            id="btn-submit-create-game"
            className={gameMode === 'ELITE' ? 'btn-create-game-elite' : 'btn btn-primary'}
            disabled={!isValidCards || loading}
            style={{ width: '100%', minHeight: '52px', fontSize: '1.05rem', letterSpacing: '0.06em' }}
          >
            <span className="btn-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
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
      </form>
    </div>
  );
}
