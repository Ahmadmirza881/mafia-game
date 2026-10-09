import React, { useState } from 'react';

export function SecretRoleCard({ roleInfo }) {
  const [isRevealed, setIsRevealed] = useState(true);

  if (!roleInfo) return null;

  const { role, display_name, description, player_name, game_code } = roleInfo;
  const roleClass = `role-${(role || '').toLowerCase()}`;
  const textClass = `text-${(role || '').toLowerCase()}`;

  // Professional Vector Insignia for Each Role
  const renderRoleInsignia = (roleType) => {
    switch ((roleType || '').toUpperCase()) {
      case 'MAFIA':
        return (
          <svg width="74" height="74" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C12 2 4 10.5 4 15.5C4 18.5 6.5 20.5 9.5 19.5V22H14.5V19.5C17.5 20.5 20 18.5 20 15.5C20 10.5 12 2 12 2Z" />
          </svg>
        );
      case 'DETECTIVE':
        return (
          <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7.5" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        );
      case 'DOCTOR':
        return (
          <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M12 7V17M7 12H17" strokeWidth="2.5" />
          </svg>
        );
      case 'CITIZEN':
      default:
        return (
          <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
    }
  };

  return (
    <div className="secret-role-container">
      {/* Game and Player identification banner */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Game: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{game_code}</strong>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '0.2rem' }}>
          {player_name}
        </div>
      </div>

      {!isRevealed ? (
        <div
          className="role-covered-card"
          onClick={() => setIsRevealed(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsRevealed(true)}
        >
          <div className="eye-icon" style={{ fontSize: '3.2rem', color: 'rgba(239, 68, 68, 0.45)', lineHeight: 1 }}>♠</div>
          <div className="cover-title">Role is Hidden</div>
          <div className="cover-subtitle">Tap anywhere to reveal your secret card</div>
        </div>
      ) : (
        <div className={`secret-role-card ${roleClass}`}>
          <div className="role-emblem">
            {renderRoleInsignia(role)}
          </div>
          <div className={`role-title-badge ${textClass}`}>
            YOU ARE {display_name.toUpperCase()}
          </div>
          <div className="role-divider"></div>
          <p className="role-instructions">{description}</p>
          <div className="privacy-notice">
            <span>Keep your role secret</span>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.6rem 1rem' }}
              onClick={() => setIsRevealed(false)}
            >
              Hide Role (Privacy Shield)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
