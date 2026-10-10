import React, { useState } from 'react';

export function GameCodeCard({ gameCode }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const joinUrl = `${window.location.origin}/?join=${encodeURIComponent(gameCode)}`;

  // Extract only the digits/suffix after MAFIA- (e.g. "5765" from "MAFIA-5765")
  const codeDigits = (gameCode || '').replace(/^MAFIA-?/i, '').trim();

  const handleCopyCode = async () => {
    try {
      const codeToCopy = codeDigits || gameCode;
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(joinUrl)}&bgcolor=18-20-29&color=255-255-255&margin=10`;

  return (
    <div className="game-code-box">
      <div className="game-code-label">GAME CODE</div>
      <div className="game-code-text">{gameCode}</div>

      {/* Direct Phone Link guidance */}
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.9rem' }}>
        Share code or open <strong style={{ color: 'var(--text-main)' }}>{window.location.host}</strong> on mobile
      </div>

      <div className="code-actions">
        <button type="button" className="btn-copy" onClick={handleCopyCode}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
        </button>

        <button type="button" className="btn-copy" onClick={handleCopyLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
        </button>

        <button
          type="button"
          className="btn-copy btn-qr-toggle"
          onClick={() => setShowQR(!showQR)}
          style={{ borderColor: showQR ? 'var(--accent-gold)' : undefined }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>{showQR ? 'Close QR' : 'Show QR Code'}</span>
        </button>
      </div>

      {/* QR Code for instant phone camera scanning */}
      {showQR && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#12141c', borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
          <img
            src={qrImageUrl}
            alt="Scan QR to join on phone"
            style={{ width: '180px', height: '180px', borderRadius: '8px', display: 'block', margin: '0 auto' }}
          />
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.6rem' }}>
            Point your phone camera at this QR code to join instantly
          </div>
        </div>
      )}
    </div>
  );
}
