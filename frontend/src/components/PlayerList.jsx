import React from 'react';

export function PlayerList({ players = [], requiredCount = 0, currentUserName = '' }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <span>Joined Players</span>
        </div>
        <div className={`status-pill ${players.length >= requiredCount ? 'status-ready' : 'status-waiting'}`}>
          {players.length} / {requiredCount} {players.length >= requiredCount ? '✓' : ''}
        </div>
      </div>

      {players.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.25rem 0' }}>
          Waiting for players to join with the Game Code...
        </div>
      ) : (
        <ul className="player-list">
          {players.map((p, idx) => {
            const isMe = currentUserName && p.name.toLowerCase() === currentUserName.toLowerCase();
            return (
              <li key={idx} className={`player-item ${isMe ? 'is-me' : ''}`}>
                <span>{p.name} {isMe ? ' (You)' : ''}</span>
                <span className="check-icon">✓</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
