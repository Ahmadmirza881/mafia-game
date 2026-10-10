import React from 'react';

export function PlayerList({
  players = [],
  requiredCount = 0,
  currentUserName = '',
  isHost = false,
  gameStatus = 'WAITING',
  onKick = null,
  onEliminate = null,
  onRevive = null,
}) {
  const isFull = players.length >= requiredCount && requiredCount > 0;
  const progressPercent = Math.min(100, (players.length / Math.max(1, requiredCount)) * 100);

  const aliveCount = players.filter((p) => p.is_alive !== false).length;
  const deadCount = players.filter((p) => p.is_alive === false).length;

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: '0.75rem' }}>
        <div className="card-title">
          <span>Joined Players</span>
        </div>
        <div className={`status-pill ${isFull ? 'status-ready' : 'status-waiting'}`}>
          {gameStatus === 'DISTRIBUTED' ? (
            <span>{aliveCount} Alive / {deadCount} Dead</span>
          ) : (
            <span>{players.length} / {requiredCount} {isFull ? 'Ready' : 'Waiting'}</span>
          )}
        </div>
      </div>

      {/* Sleek animated lobby progress bar (only in lobby) */}
      {gameStatus === 'WAITING' && (
        <div className="lobby-progress-track">
          <div
            className={`lobby-progress-bar ${isFull ? 'is-complete' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {players.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.5rem 0' }}>
          <div className="pulse-spinner" style={{ width: 28, height: 28, margin: '0 auto 0.75rem auto' }} />
          <span>Waiting for players to enter the Game Code...</span>
        </div>
      ) : (
        <ul className="player-list">
          {players.map((p, idx) => {
            const isMe = currentUserName && p.name.toLowerCase() === currentUserName.toLowerCase();
            const isDead = p.is_alive === false;

            return (
              <li
                key={p.name + idx}
                className={`player-item ${isMe ? 'is-me' : ''} ${isDead ? 'is-dead' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="player-num-badge">#{idx + 1}</span>
                  <span className={`player-name-text ${isDead ? 'text-strikethrough' : ''}`}>
                    {p.name} {isMe ? <strong style={{ color: 'var(--accent-gold)', fontSize: '0.82rem' }}>(You)</strong> : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {isDead ? (
                    <span className="player-dead-indicator" title="Eliminated / Dead">
                      <span className="dead-dot" />
                      <span>Dead</span>
                    </span>
                  ) : (
                    <span className="player-ready-indicator">
                      <span className="ready-dot" />
                      <span>Alive</span>
                    </span>
                  )}

                  {/* Host Icon-Only Action Buttons */}
                  {isHost && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.2rem' }}>
                      {/* Lobby Kick Button (✕ Icon-only) */}
                      {gameStatus === 'WAITING' && onKick && (
                        <button
                          type="button"
                          className="btn-action-icon btn-kick-icon"
                          onClick={() => onKick(p.name)}
                          title={`Kick ${p.name}`}
                          aria-label={`Kick ${p.name}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      )}

                      {/* In-Game Eliminate / Revive (Icon-only) */}
                      {gameStatus === 'DISTRIBUTED' && (
                        <>
                          {!isDead && onEliminate ? (
                            <button
                              type="button"
                              className="btn-action-icon btn-eliminate-icon"
                              onClick={() => onEliminate(p.name)}
                              title={`Eliminate ${p.name}`}
                              aria-label={`Eliminate ${p.name}`}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="12" r="1.5" fill="currentColor"></circle>
                                <circle cx="15" cy="12" r="1.5" fill="currentColor"></circle>
                                <path d="M8 20v2h8v-2"></path>
                                <path d="M12 4a8 8 0 0 0-8 8c0 3 1.5 5.5 4 7v1h8v-1c2.5-1.5 4-4 4-7a8 8 0 0 0-8-8z"></path>
                              </svg>
                            </button>
                          ) : onRevive ? (
                            <button
                              type="button"
                              className="btn-action-icon btn-revive-icon"
                              onClick={() => onRevive(p.name)}
                              title={`Revive ${p.name}`}
                              aria-label={`Revive ${p.name}`}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                              </svg>
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
