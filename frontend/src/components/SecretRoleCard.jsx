import React, { useState } from 'react';
import { sounds } from '../utils/soundEffects';

export function SecretRoleCard({ roleInfo }) {
  // Start face-down (showing the backside) for privacy and maximum suspense
  const [isRevealed, setIsRevealed] = useState(false);

  if (!roleInfo) return null;

  const {
    role,
    display_name,
    description,
    player_name,
    game_code,
    card_image,
    card_back_image,
    team,
    special_ability,
    game_mode,
  } = roleInfo;

  const isElite = (game_mode || '').toUpperCase() === 'ELITE';
  const roleUpper = (role || '').toUpperCase();
  const isMafia = roleUpper === 'MAFIA';
  const isDetective = roleUpper === 'DETECTIVE';
  const isCivilian = roleUpper === 'CITIZEN' || roleUpper === 'CIVILIAN';
  const isDoctor = roleUpper === 'DOCTOR';
  const isGodfather = roleUpper === 'GODFATHER';
  const isJester = roleUpper === 'JESTER';
  const isMayor = roleUpper === 'MAYOR';

  // Card back selection (Classic vs Elite)
  const activeCardBack = card_back_image || (isElite ? '/elite-card-back.jpg' : '/card-back.jpg');

  // Fallback card illustrations
  const defaultCardImage = isElite
    ? (isGodfather ? '/elite-godfather-card.jpg'
      : isJester ? '/elite-jester-card.jpg'
      : isMayor ? '/elite-mayor-card.jpg'
      : isMafia ? '/elite-mafia-card.jpg'
      : isCivilian ? '/elite-civilian-card.jpg'
      : isDetective ? '/elite-detective-card.jpg'
      : isDoctor ? '/elite-doctor-card.jpg'
      : '/elite-card-back.jpg')
    : (isMafia ? '/mafia-card.jpg'
      : isDetective ? '/detective-card.jpg'
      : isCivilian ? '/civilian-card.jpg'
      : isDoctor ? '/doctor-card.jpg'
      : '/card-back.jpg');

  const cardImage = card_image || defaultCardImage;
  const roleClass = `role-${(role || '').toLowerCase()}`;
  const textClass = `text-${(role || '').toLowerCase()}`;

  // Fallback vector insignia
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
      case 'GODFATHER':
        return (
          <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="rgba(245, 158, 11, 0.25)" />
            <circle cx="12" cy="19" r="2.5" fill="#f59e0b" />
          </svg>
        );
      case 'JESTER':
        return (
          <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12a10 10 0 0 0 20 0c0-6-4-10-10-10S2 6 2 12z" fill="rgba(192, 132, 252, 0.2)" />
            <path d="M8 10h.01M16 10h.01" strokeWidth="3" />
            <path d="M8 15c2 2 6 2 8 0" />
          </svg>
        );
      case 'MAYOR':
        return (
          <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M6 8l6-5 6 5M6 8L3 14h6L6 8zM18 8l-3 6h6l-3-6z" fill="rgba(251, 191, 36, 0.2)" />
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

  const handleToggle = () => {
    sounds.playCardFlip();
    setIsRevealed((prev) => !prev);
  };

  return (
    <div className="secret-role-container">
      {/* Game and Player identification banner */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span className={isElite ? 'mode-pill-elite' : 'mode-pill-classic'}>
            {isElite ? '👑 MAFIA ELITE' : 'MAFIA CLASSIC'}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            ROOM: <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{game_code}</strong>
          </span>
        </div>
        <div style={{ fontSize: '1.45rem', fontWeight: '800' }}>
          {player_name}
        </div>
      </div>

      {/* 3D Interactive Flip Card */}
      <div
        className={`card-flip-container ${isRevealed ? 'is-flipped' : ''} ${isElite ? 'card-flip-container-elite' : ''}`}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-pressed={isRevealed}
        aria-label={isRevealed ? "Hide role card" : "Reveal secret role card"}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggle()}
      >
        <div className="card-flip-inner">
          {/* BACK FACE (Default Face-down state) */}
          <div className={`card-flip-face card-flip-back ${isElite ? 'card-flip-back-elite' : ''}`}>
            <img
              src={activeCardBack}
              alt="Secret Card Back"
              className="card-flip-img"
              loading="eager"
            />
            <div className="card-face-overlay">
              <span className={`card-pulse-chip ${isElite ? 'chip-elite' : ''}`}>
                {isElite ? '👑 TAP TO REVEAL 👑' : '♠ TAP TO REVEAL ♠'}
              </span>
            </div>
          </div>

          {/* FRONT FACE (Revealed state: Illustrated Role Card) */}
          <div className={`card-flip-face card-flip-front ${roleClass} ${isElite ? 'card-flip-front-elite' : ''}`}>
            {cardImage ? (
              <img
                src={cardImage}
                alt={`${display_name} Secret Card`}
                className="card-flip-img"
                loading="eager"
              />
            ) : (
              <div className="card-flip-fallback-content">
                <div className="role-emblem">{renderRoleInsignia(role)}</div>
                <div className={`role-title-badge ${textClass}`}>
                  YOU ARE {display_name.toUpperCase()}
                </div>
                <div className="role-divider"></div>
                <p className="role-instructions">{description}</p>
              </div>
            )}
            <div className="card-face-overlay front-overlay">
              <span className="card-pulse-chip hide-chip">TAP TO HIDE</span>
            </div>
          </div>
        </div>
      </div>

      {/* State indicator and hint */}
      <div style={{ textAlign: 'center', marginTop: '1rem', minHeight: '2.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: isRevealed ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
          {isRevealed
            ? 'Keep your screen hidden from other players.'
            : 'Card is face down. Tap card or button to reveal.'}
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: '0.5rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          className={`btn ${isRevealed ? 'btn-secondary' : isElite ? 'btn-primary btn-gold-sheen' : 'btn-primary'}`}
          style={{
            fontSize: '0.92rem',
            padding: '0.75rem 1.4rem',
            width: '100%',
            maxWidth: '320px',
            boxShadow: !isRevealed
              ? (isElite ? '0 0 24px rgba(245, 158, 11, 0.4)' : '0 0 20px var(--accent-mafia-glow)')
              : 'none',
          }}
          onClick={handleToggle}
        >
          <span className="btn-icon" style={{ display: 'flex', alignItems: 'center' }}>
            {isRevealed ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </span>
          <span>{isRevealed ? 'Hide Card (Privacy Shield)' : 'Reveal Secret Card'}</span>
        </button>
      </div>

      {/* Elite Role Dossier (Revealed details below card in Elite mode) */}
      {isRevealed && isElite && (
        <div className="elite-role-dossier-card" style={{ marginTop: '1.25rem' }}>
          <div className="dossier-header">
            <span className="dossier-badge">{team || 'Role Allegiance'}</span>
            <span className="dossier-title">{display_name}</span>
          </div>

          {special_ability && (
            <div className="dossier-ability-chip">
              <span className="ability-label">Special Ability:</span>
              <span className="ability-text">{special_ability}</span>
            </div>
          )}

          <p className="dossier-desc">{description}</p>
        </div>
      )}
    </div>
  );
}
