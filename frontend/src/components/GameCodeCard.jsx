import React, { useState } from 'react';

export function GameCodeCard({ gameCode }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const joinUrl = `${window.location.origin}/?join=${encodeURIComponent(gameCode)}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
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
          {copiedCode ? 'Copied' : 'Copy Code'}
        </button>
        <button type="button" className="btn-copy" onClick={handleCopyLink}>
          {copiedLink ? 'Copied' : 'Copy Link'}
        </button>
        <button
          type="button"
          className="btn-copy btn-qr-toggle"
          onClick={() => setShowQR(!showQR)}
          style={{ borderColor: showQR ? 'var(--accent-gold)' : undefined }}
        >
          {showQR ? 'Close QR' : 'Show QR Code'}
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
