import React, { useState } from 'react';
import { RoleCounter } from '../components/RoleCounter';
import { api } from '../services/api';

export function CreateGame({ onBack, onGameCreated }) {
  // Step 1: Host Login Credentials, Step 2: Configure Game
  const [step, setStep] = useState(1);

  // Host Credentials
  const [hostEmail, setHostEmail] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mafia_host_email');
      if (saved && !saved.toLowerCase().includes('mumtazpharmacy')) {
        return saved;
      }
      return 'admin@mafia';
    } catch {
      return 'admin@mafia';
    }
  });
  const [hostPassword, setHostPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Game Configuration
  const [playerCount, setPlayerCount] = useState(5);
  const [roles, setRoles] = useState({
    MAFIA: 1,
    CITIZEN: 2,
    DETECTIVE: 1,
    DOCTOR: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalCards = Object.values(roles).reduce((acc, qty) => acc + qty, 0);
  const cardsDiff = totalCards - playerCount;
  const isValidCards = cardsDiff === 0;

  const handleRoleChange = (roleKey, newQty) => {
    setRoles((prev) => ({
      ...prev,
      [roleKey]: Math.max(0, newQty),
    }));
  };

  // Step 1: Verify & Proceed to Configure
  const handleHostLoginNext = (e) => {
    e.preventDefault();
    const cleanEmail = hostEmail.trim();
    const cleanPassword = hostPassword.trim();

    if (!cleanEmail) {
      setError('Please enter your Host Email or ID (e.g. admin@mafia).');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      setError('Please enter a host password (minimum 4 characters).');
      return;
    }

    try {
      sessionStorage.setItem('mafia_host_email', cleanEmail);
    } catch {}

    setError('');
    setStep(2); // Proceed to Game Configuration!
  };

  // Step 2: Create Game with credentials & configured roles
  const handleCreateGameSubmit = async (e) => {
    e.preventDefault();
    if (!isValidCards) return;

    setError('');
    setLoading(true);

    try {
      const resp = await api.createGame(
        playerCount,
        roles,
        hostEmail.trim(),
        hostPassword.trim()
      );
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
        onClick={step === 1 ? onBack : () => { setStep(1); setError(''); }}
      >
        {step === 1 ? '← Back to Home' : '← Back to Host Login'}
      </button>

      {/* 2-Step Flow Indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', maxWidth: step === 1 ? '480px' : '100%', margin: step === 1 ? '0 auto 1.25rem auto' : '0 0 1.25rem 0' }}>
        <div
          style={{
            flex: 1,
            padding: '0.65rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            background: step === 1 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-input)',
            border: step === 1 ? '1.5px solid var(--accent-mafia)' : '1px solid var(--border-color)',
            color: step === 1 ? 'var(--text-main)' : 'var(--text-dim)',
            fontSize: '0.82rem',
            fontWeight: '700',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            cursor: step === 2 ? 'pointer' : 'default'
          }}
          onClick={() => step === 2 && setStep(1)}
        >
          <span>{step === 2 ? '✓' : '1.'}</span>
          <span>Host Login</span>
        </div>

        <div
          style={{
            flex: 1,
            padding: '0.65rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            background: step === 2 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-input)',
            border: step === 2 ? '1.5px solid var(--accent-mafia)' : '1px solid var(--border-color)',
            color: step === 2 ? 'var(--text-main)' : 'var(--text-dim)',
            fontSize: '0.82rem',
            fontWeight: '700',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <span>2.</span>
          <span>Configure Game</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ maxWidth: step === 1 ? '480px' : '100%', margin: step === 1 ? '0 auto 1.25rem auto' : '0 0 1.25rem 0' }}>
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: HOST LOGIN / CREDENTIALS (Centered Compact Card) */}
      {step === 1 && (
        <div className="centered-container">
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <span>Step 1: Host Login</span>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: '1.45' }}>
              Please login as the Host with your email/ID and password. Once authenticated, you will be able to configure game roles.
            </p>

            <form onSubmit={handleHostLoginNext}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-host-email">Host Email / ID</label>
                <input
                  id="input-host-email"
                  type="text"
                  className="input-text"
                  placeholder="admin@mafia"
                  value={hostEmail}
                  onChange={(e) => setHostEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="input-host-password">Host Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="input-host-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-text"
                    placeholder="Enter host password (min 4 characters)"
                    value={hostPassword}
                    onChange={(e) => setHostPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingRight: '3.8rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
                  This password secures your host controls and lets you re-open this room from any device.
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '1.1rem', fontSize: '1.05rem' }}
              >
                <span>LOGIN & CONFIGURE GAME →</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 2: CONFIGURE GAME ROLES & PLAYERS (Responsive 2-Column Grid on Laptop) */}
      {step === 2 && (
        <form onSubmit={handleCreateGameSubmit}>
          <div className="create-game-grid">
            {/* LEFT COLUMN: Host Credentials Badge & Required Player Stepper */}
            <div>
              {/* Active Host Credentials Indicator */}
              <div
                className="card"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Authenticated Host
                  </div>
                  <strong style={{ color: 'var(--text-main)', fontSize: '1.05rem' }}>{hostEmail}</strong>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', padding: '0.3rem 0.6rem', cursor: 'pointer' }}
                  onClick={() => setStep(1)}
                >
                  Change
                </button>
              </div>

              {/* Player Count Card */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <span>Player Count</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Total Required Players</label>
                  <RoleCounter
                    label="Players"
                    value={playerCount}
                    min={3}
                    max={50}
                    onChange={(val) => setPlayerCount(val)}
                  />
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                    Configure the exact number of players participating (Min: 3, Max: 50).
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Role Distribution Steppers & Validation Action */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>Role Distribution</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {totalCards} / {playerCount} Cards
                </div>
              </div>

              <div className="form-group">
                <RoleCounter
                  label="Mafia"
                  value={roles.MAFIA}
                  min={0}
                  max={playerCount}
                  onChange={(val) => handleRoleChange('MAFIA', val)}
                />

                <RoleCounter
                  label="Citizen"
                  value={roles.CITIZEN}
                  min={0}
                  max={playerCount}
                  onChange={(val) => handleRoleChange('CITIZEN', val)}
                />

                <RoleCounter
                  label="Detective"
                  value={roles.DETECTIVE}
                  min={0}
                  max={playerCount}
                  onChange={(val) => handleRoleChange('DETECTIVE', val)}
                />

                <RoleCounter
                  label="Doctor"
                  value={roles.DOCTOR}
                  min={0}
                  max={playerCount}
                  onChange={(val) => handleRoleChange('DOCTOR', val)}
                />
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
                    <span>Total cards match {playerCount} players. Ready to create game.</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                id="btn-submit-create-game"
                className="btn btn-primary"
                disabled={!isValidCards || loading}
                style={{ padding: '1.05rem', fontSize: '1.05rem' }}
              >
                {loading ? 'Creating Game...' : 'CREATE GAME LOBBY'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
