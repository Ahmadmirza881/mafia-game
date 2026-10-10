import React from 'react';
import { MafiaLogo } from '../components/MafiaLogo';

export function Landing({ onNavigate }) {
  return (
    <div className="landing-page-container">
      {/* Top Mafia Brand Logo matching the reference image */}
      <div className="landing-logo-container">
        <MafiaLogo size="large" />
      </div>

      {/* Main Glassmorphic Card matching the reference image */}
      <div className="landing-card-exact">
        {/* Secret Card Distribution Pill with horizontal faded lines */}
        <div className="pill-divider-container">
          <span className="pill-line left" />
          <div className="distribution-pill">
            <span className="pill-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="15" height="16" rx="2" />
                <path d="M7 2h13a2 2 0 0 1 2 2v13" />
              </svg>
            </span>
            <span className="pill-text">SECRET CARD DISTRIBUTION</span>
          </div>
          <span className="pill-line right" />
        </div>

        {/* Headline */}
        <h2 className="card-headline">
          Distribute secret roles to all players instantly on their own phones or laptops.
        </h2>

        {/* Subtext */}
        <p className="card-subtext">
          No cards to shuffle, no moderator peeking. Each player sees strictly their own secret card.
        </p>

        {/* 3 Feature Boxes Grid with Crisp Vector Icons */}
        <div className="feature-boxes-grid">
          <div className="feature-box">
            <div className="feature-box-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
              </svg>
            </div>
            <div className="feature-box-text">Phone QR Scan</div>
          </div>
          <div className="feature-box">
            <div className="feature-box-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="feature-box-text">Strict Privacy</div>
          </div>
          <div className="feature-box">
            <div className="feature-box-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="feature-box-text">Live Sync</div>
          </div>
        </div>

        {/* Dual Mode Showcase Strip */}
        <div className="landing-modes-strip">
          <div className="mode-strip-item classic">
            <span className="mode-strip-badge">♠ MAFIA CLASSIC</span>
            <span className="mode-strip-text">Traditional 4 Roles</span>
          </div>
          <div className="mode-strip-divider">VS</div>
          <div className="mode-strip-item elite">
            <span className="mode-strip-badge gold">👑 MAFIA ELITE</span>
            <span className="mode-strip-text">+ Godfather, Jester & Mayor</span>
          </div>
        </div>

        {/* Button 1: CREATE GAME (Crimson Gradient) */}
        <button
          type="button"
          id="btn-nav-create"
          className="btn-create-game-exact"
          onClick={() => onNavigate('create')}
        >
          <span className="btn-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span className="btn-text">CREATE GAME</span>
        </button>

        {/* Button 2: JOIN GAME (Dark Charcoal with subtle spades on left & right) */}
        <button
          type="button"
          id="btn-nav-join"
          className="btn-join-game-exact"
          onClick={() => onNavigate('join')}
        >
          <span className="button-spade-icon">♠</span>
          <div className="button-join-center">
            <span className="btn-icon" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2" />
                <line x1="2" y1="9" x2="22" y2="9" />
              </svg>
            </span>
            <span className="btn-text">JOIN GAME</span>
          </div>
          <span className="button-spade-icon">♠</span>
        </button>
      </div>
    </div>
  );
}
