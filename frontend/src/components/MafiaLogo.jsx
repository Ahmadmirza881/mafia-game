import React from 'react';

export function MafiaLogo({ size = 'large' }) {
  const isLarge = size === 'large';

  return (
    <div className={`mafia-logo-wrapper ${isLarge ? 'logo-large' : 'logo-compact'}`}>
      <div className="logo-header-group">
        {/* Fedora Hat on Top-Left */}
        <div className="logo-hat-badge" title="Mafia Fedora">
          <svg width="46" height="30" viewBox="0 0 46 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Fedora Brim */}
            <path
              d="M3 24C8 21 16 22 23 22C30 22 38 21 43 24C44 24.6 42 26.5 38 27C29 28 17 28 8 27C4 26.5 2 24.6 3 24Z"
              fill="#b91c1c"
            />
            <path
              d="M4 24.5C9 22.5 16 23 23 23C30 23 37 22.5 42 24.5"
              stroke="#ef4444"
              strokeWidth="0.8"
            />
            {/* Crown with pinch */}
            <path
              d="M12 22C11 15 13 8 18 6C20 5.2 23 6.5 25 5.5C28 7 31 14 30 22Z"
              fill="#dc2626"
            />
            {/* Crown Shading */}
            <path
              d="M18 6C15 8 13 14 13 22H19C19 14 17 8 18 6Z"
              fill="#991b1b"
              opacity="0.6"
            />
            {/* Black Ribbon */}
            <path
              d="M12 19C16 18.5 26 18.5 30 19L30.2 22C26 21.5 16 21.5 11.8 22L12 19Z"
              fill="#18181b"
            />
            <path
              d="M12 19C16 18.5 26 18.5 30 19"
              stroke="#27272a"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        {/* Word MAFIA */}
        <h1 className="logo-title-text">MAFIA</h1>

        {/* Two Angled Playing Cards on Top-Right */}
        <div className="logo-cards-badge" title="Playing Cards">
          <svg width="54" height="42" viewBox="0 0 54 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Back Card (tilted ~ -8deg) */}
            <g transform="translate(14, 4) rotate(-10)">
              <rect x="0" y="0" width="18" height="27" rx="2.5" fill="#181a24" stroke="#ef4444" strokeWidth="1" />
              {/* Corner 'A' */}
              <text x="2.5" y="6.5" fill="#f87171" fontSize="5.5" fontWeight="900" fontFamily="serif">A</text>
              {/* Corner mini suit */}
              <text x="2.5" y="11" fill="#f87171" fontSize="4.5">♦</text>
              {/* Center Suit */}
              <text x="9" y="17" fill="#dc2626" fontSize="8" textAnchor="middle">♦</text>
            </g>

            {/* Front Card (tilted ~ +14deg) */}
            <g transform="translate(24, 6) rotate(14)">
              <rect x="0" y="0" width="19" height="28" rx="2.5" fill="#0f1118" stroke="#ef4444" strokeWidth="1.2" />
              {/* Corner 'A' */}
              <text x="2.5" y="6.5" fill="#ef4444" fontSize="5.5" fontWeight="900" fontFamily="serif">A</text>
              {/* Corner mini suit */}
              <text x="2.5" y="11" fill="#ef4444" fontSize="4.5">♠</text>
              {/* Center Spade in glowing red */}
              <path
                d="M9.5 12C9.5 12 6.5 15.5 6.5 17.5C6.5 19 7.8 20 9.2 19.5C9.4 19.4 9.5 19.3 9.5 19.3V21.5H8.5V22.5H10.5V21.5H9.5V19.3C9.5 19.3 9.6 19.4 9.8 19.5C11.2 20 12.5 19 12.5 17.5C12.5 15.5 9.5 12 9.5 12Z"
                fill="#ef4444"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Subtitle with Sleek Gradient Divider Lines: ── CARD GAME ── */}
      <div className="logo-card-game-row">
        <span className="logo-divider-line left" />
        <span className="logo-card-game-text">CARD GAME</span>
        <span className="logo-divider-line right" />
      </div>
    </div>
  );
}
