import React, { useState, useEffect, useCallback } from 'react';
import { PlayerList } from '../components/PlayerList';
import { SecretRoleCard } from '../components/SecretRoleCard';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { sounds } from '../utils/soundEffects';

export function PlayerScreen({ initialGame, playerName, sessionToken, onLeave }) {
  const [game, setGame] = useState(initialGame);
  const [players, setPlayers] = useState([]);
  const [roleInfo, setRoleInfo] = useState(null);
  const [loadingRole, setLoadingRole] = useState(false);
  const [isGameClosed, setIsGameClosed] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState('');
  const [showGhostRole, setShowGhostRole] = useState(false);

  // Detective Investigation Tool state
  const [investigateTarget, setInvestigateTarget] = useState('');
  const [investigating, setInvestigating] = useState(false);
  const [investigateResult, setInvestigateResult] = useState(null);
  const [investigationLog, setInvestigationLog] = useState([]);

  // Jester Victory celebration state
  const [jesterVictoryData, setJesterVictoryData] = useState(null);

  const isElite = (game.game_mode || '').toUpperCase() === 'ELITE';

  // Fetch public player list (names only, no roles!)
  const refreshPlayers = useCallback(async () => {
    try {
      const list = await api.getPlayers(game.game_code);
      setPlayers(list);
    } catch (err) {
      console.warn('Failed to load players:', err);
    }
  }, [game.game_code]);

  // Fetch my own secret role using session token
  const fetchMyRole = useCallback(async () => {
    setLoadingRole(true);
    setError('');
    try {
      const myRole = await api.getMyRole(sessionToken);
      setRoleInfo(myRole);
    } catch (err) {
      setError(err.message || 'Failed to fetch assigned role.');
    } finally {
      setLoadingRole(false);
    }
  }, [sessionToken]);

  // On mount: fetch players list; if game is already distributed, fetch role immediately!
  useEffect(() => {
    refreshPlayers();
    if (game.status === 'DISTRIBUTED') {
      fetchMyRole();
    }
  }, [game.status, fetchMyRole, refreshPlayers]);

  // Auto-redirect countdown when game is closed by host
  useEffect(() => {
    if (!isGameClosed) return;

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onLeave();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isGameClosed, onLeave]);

  // Handle real-time WebSocket events
  const handleWsMessage = useCallback((data) => {
    if (data.type === 'PLAYER_JOINED') {
      sounds.playPlayerJoined();
      if (data.game) setGame(data.game);
      refreshPlayers();
    } else if (data.type === 'GAME_CONFIG_UPDATED') {
      if (data.game) setGame(data.game);
    } else if (data.type === 'GAME_CLOSED') {
      setIsGameClosed(true);
      setError(data.message || 'The host has exited and closed this game lobby.');
    } else if (data.type === 'DISTRIBUTION_STARTED') {
      sounds.playShuffle();
      setGame((prev) => ({ ...prev, status: 'DISTRIBUTING' }));
    } else if (data.type === 'DISTRIBUTION_COMPLETE') {
      sounds.playDramaticReveal();
      setGame((prev) => ({ ...prev, status: 'DISTRIBUTED' }));
      fetchMyRole();
    } else if (data.type === 'REMATCH_STARTED') {
      sounds.playShuffle();
      setRoleInfo(null);
      setInvestigateResult(null);
      setInvestigationLog([]);
      setJesterVictoryData(null);
      if (data.game) {
        setGame(data.game);
      } else {
        setGame((prev) => ({ ...prev, status: 'WAITING' }));
      }
      refreshPlayers();
    } else if (data.type === 'PLAYER_KICKED') {
      if (data.kicked_player_name?.toLowerCase() === playerName?.toLowerCase()) {
        alert('You have been removed from the lobby by the host.');
        onLeave();
      } else {
        refreshPlayers();
        if (data.game) setGame(data.game);
      }
    } else if (data.type === 'PLAYER_STATUS_UPDATED') {
      if (data.player_name?.toLowerCase() === playerName?.toLowerCase()) {
        setRoleInfo((prev) => (prev ? { ...prev, is_alive: data.is_alive, elimination_reason: data.reason } : prev));
      }
      refreshPlayers();
    } else if (data.type === 'JESTER_VICTORY') {
      sounds.playJesterVictory();
      setJesterVictoryData({
        playerName: data.player_name,
        message: data.message || `🎭 ${data.player_name} (The Jester) has been voted out and achieved an independent victory!`,
      });
    }
  }, [fetchMyRole, playerName, onLeave, refreshPlayers]);

  const { isConnected } = useWebSocket(game.game_code, handleWsMessage);

  // Detective Investigation submission
  const handleInvestigate = async (e) => {
    e.preventDefault();
    if (!investigateTarget || investigating) return;

    setInvestigating(true);
    setError('');

    try {
      sounds.playInvestigation();
      const resp = await api.investigatePlayer(game.game_code, investigateTarget, sessionToken);
      setInvestigateResult(resp);
      setInvestigationLog((prev) => [
        {
          target: resp.target_name,
          result: resp.result,
          allegiance: resp.allegiance,
          message: resp.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err.message || 'Investigation failed.');
    } finally {
      setInvestigating(false);
    }
  };

  const isDetective = roleInfo?.role?.toUpperCase() === 'DETECTIVE';
  const isGodfather = roleInfo?.role?.toUpperCase() === 'GODFATHER';
  const isJester = roleInfo?.role?.toUpperCase() === 'JESTER';
  const isMayor = roleInfo?.role?.toUpperCase() === 'MAYOR';
  const isAlive = roleInfo?.is_alive !== false;

  // Living suspects that the Detective can investigate (excluding themselves)
  const livingSuspects = players.filter(
    (p) => p.is_alive !== false && p.name.toLowerCase() !== playerName.toLowerCase()
  );

  if (isGameClosed) {
    return (
      <div className="centered-container" style={{ marginTop: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.75rem', border: '1.5px solid var(--accent-mafia)', boxShadow: '0 0 30px var(--accent-mafia-glow)' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: '800', marginBottom: '0.6rem', color: '#f87171' }}>
            Host Has Left The Game
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {error || 'The host has exited and closed this game lobby.'}
          </p>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            padding: '0.6rem 1.25rem',
            borderRadius: '9999px',
            color: 'var(--text-main)',
            fontSize: '0.92rem',
            fontWeight: '700',
            marginBottom: '1.75rem',
          }}>
            <span className="pulse-spinner" style={{ width: 14, height: 14, margin: 0, borderWidth: 2 }} />
            <span>Redirecting to Home in <strong style={{ color: '#f87171', fontSize: '1.1rem' }}>{countdown}s</strong>...</span>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}
              onClick={onLeave}
            >
              <span>Return to Home Now</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', maxWidth: game.status !== 'DISTRIBUTED' ? '520px' : '100%', margin: game.status !== 'DISTRIBUTED' ? '0 auto 1rem auto' : '0 0 1rem 0' }}>
        <button type="button" className="back-link" onClick={onLeave} style={{ margin: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Leave Game</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className={isElite ? 'mode-pill-elite' : 'mode-pill-classic'}>
            {isElite ? '👑 MAFIA ELITE' : 'MAFIA CLASSIC'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isConnected ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? 'var(--accent-green)' : 'var(--accent-gold)', display: 'inline-block' }} />
            <span>{isConnected ? 'Live Sync' : 'Connecting...'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ maxWidth: game.status !== 'DISTRIBUTED' ? '520px' : '100%', margin: game.status !== 'DISTRIBUTED' ? '0 auto 1.25rem auto' : '0 0 1.25rem 0' }}>
          <span>{error}</span>
        </div>
      )}

      {/* BEFORE DISTRIBUTION - Waiting Room */}
      {game.status !== 'DISTRIBUTED' && (
        <div className="centered-container">
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className={isElite ? 'mode-pill-elite' : 'mode-pill-classic'}>
                {isElite ? '👑 Mafia Elite Room' : 'Mafia Classic Room'}
              </span>
              <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{game.game_code}</strong>
            </div>

            <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.25rem' }}>
              Welcome, {playerName}
            </div>

            <div style={{ margin: '1.5rem 0' }}>
              <div className="pulse-spinner" style={{ width: 42, height: 42, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-gold)' }}>
                {game.status === 'DISTRIBUTING' ? 'Distributing Secret Cards...' : 'Waiting for Host...'}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: '280px', margin: '0.5rem auto 0 auto' }}>
                Your secret role card will arrive automatically when the Host distributes the cards.
              </p>
            </div>

            <div className="status-pill status-waiting" style={{ marginTop: '0.75rem' }}>
              {players.length} / {game.required_players} Players Joined
            </div>
          </div>

          {/* Joined players list in waiting room */}
          <PlayerList players={players} requiredCount={game.required_players} currentUserName={playerName} />
        </div>
      )}

      {/* AFTER DISTRIBUTION */}
      {game.status === 'DISTRIBUTED' && (
        <div className="player-distributed-grid">
          <div>
            {loadingRole && (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div className="pulse-spinner" />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  Decrypting your secret card...
                </div>
              </div>
            )}

            {/* GHOST / ELIMINATED VIEW */}
            {roleInfo && !isAlive ? (
              <div className="card ghost-mode-card">
                <div className="ghost-skull-container">
                  <svg
                    className="ghost-skull-svg"
                    width="88"
                    height="88"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a9 9 0 0 0-9 9c0 3.2 1.8 6 4.5 7.4V21a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2.6c2.7-1.4 4.5-4.2 4.5-7.4a9 9 0 0 0-9-9z"></path>
                    <circle cx="9" cy="11" r="1.75" fill="#ef4444"></circle>
                    <circle cx="15" cy="11" r="1.75" fill="#ef4444"></circle>
                    <path d="M10 17v3"></path>
                    <path d="M14 17v3"></path>
                    <path d="M12 17v3"></path>
                  </svg>
                </div>

                <h2 className="ghost-title">YOU HAVE BEEN ELIMINATED</h2>
                <div className="ghost-badge">GHOST SPECTATOR MODE</div>

                <p className="ghost-desc">
                  You are now in spectator mode. Please remain silent and do not reveal your secret identity or observations to living players.
                </p>

                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.55rem' }}
                    onClick={() => setShowGhostRole((prev) => !prev)}
                  >
                    <span>{showGhostRole ? 'Hide Secret Card' : 'Peek At Your Secret Card'}</span>
                  </button>
                </div>

                {showGhostRole && (
                  <div style={{ marginTop: '1.25rem', opacity: 0.9 }}>
                    <SecretRoleCard roleInfo={roleInfo} />
                  </div>
                )}
              </div>
            ) : (
              roleInfo && (
                <>
                  <SecretRoleCard roleInfo={roleInfo} />

                  {/* SPECIAL ROLE MECHANIC BANNERS */}
                  {isAlive && isMayor && (
                    <div className="role-mechanic-alert-box amber">
                      <div className="mechanic-alert-icon">⚖</div>
                      <div>
                        <strong>MAYOR'S AUTHORITY ACTIVE:</strong> Your vote carries double weight (counts as 2 votes) during town meetings and trial votes!
                      </div>
                    </div>
                  )}

                  {isAlive && isGodfather && (
                    <div className="role-mechanic-alert-box gold">
                      <div className="mechanic-alert-icon">👑</div>
                      <div>
                        <strong>DON'S STEALTH IMMUNITY:</strong> You lead the Mafia Syndicate. If the Detective investigates you, you will appear as an Innocent Civilian!
                      </div>
                    </div>
                  )}

                  {isAlive && isJester && (
                    <div className="role-mechanic-alert-box purple">
                      <div className="mechanic-alert-icon">🎭</div>
                      <div>
                        <strong>JESTER'S WIN CONDITION:</strong> You win solo if you trick the town into voting you out during the day trial. (If eliminated by a night attack, you do not win).
                      </div>
                    </div>
                  )}

                  {/* DETECTIVE ACTIVE INVESTIGATION TOOL */}
                  {isAlive && isDetective && (
                    <div className="card detective-dossier-card" style={{ marginTop: '1.25rem' }}>
                      <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: 'var(--accent-blue)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="7.5" />
                            <line x1="21" y1="21" x2="16.5" y2="16.5" />
                          </svg>
                          <span>Night Investigation Dossier</span>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.45 }}>
                        Select any living suspect to discreetly investigate their allegiance under cover of night:
                      </p>

                      <form onSubmit={handleInvestigate} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
                        <select
                          className="form-input"
                          style={{ flex: 1, padding: '0.65rem 0.9rem' }}
                          value={investigateTarget}
                          onChange={(e) => setInvestigateTarget(e.target.value)}
                        >
                          <option value="">-- Choose suspect to investigate --</option>
                          {livingSuspects.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '0.65rem 1.15rem' }}
                          disabled={!investigateTarget || investigating}
                        >
                          <span>{investigating ? 'Investigating...' : 'Investigate'}</span>
                        </button>
                      </form>

                      {/* Immediate Investigation Result */}
                      {investigateResult && (
                        <div className={`investigation-result-card ${investigateResult.result === 'GUILTY' ? 'is-guilty' : 'is-innocent'}`}>
                          <div className="result-header">
                            <span className="result-target">{investigateResult.target_name}</span>
                            <span className={`result-chip ${investigateResult.result === 'GUILTY' ? 'chip-guilty' : 'chip-innocent'}`}>
                              {investigateResult.result === 'GUILTY' ? 'GUILTY: MAFIA' : 'INNOCENT: CIVILIAN / TOWN'}
                            </span>
                          </div>
                          <p className="result-message">{investigateResult.message}</p>
                          {isElite && investigateResult.result === 'INNOCENT' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                              *Note: The Godfather also appears innocent when investigated.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Log of Past Investigations */}
                      {investigationLog.length > 1 && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                            Investigation Dossier History
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {investigationLog.map((log, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                                <span><strong>{log.target}</strong></span>
                                <span style={{ color: log.result === 'GUILTY' ? '#f87171' : '#60a5fa', fontWeight: '700' }}>
                                  {log.result}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )
            )}
          </div>

          <div>
            <PlayerList
              players={players}
              requiredCount={game.required_players}
              currentUserName={playerName}
              gameStatus={game.status}
            />
          </div>
        </div>
      )}

      {/* JESTER VICTORY CELEBRATION MODAL */}
      {jesterVictoryData && (
        <div className="modal-backdrop" onClick={() => setJesterVictoryData(null)}>
          <div className="modal-content jester-victory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="jester-victory-icon">🎭</div>
            <div className="jester-victory-tag">INDEPENDENT VICTORY</div>
            <h2 className="jester-victory-title">THE JESTER WINS!</h2>
            <p className="jester-victory-desc">
              {jesterVictoryData.message || `${jesterVictoryData.playerName} tricked the town into voting them out!`}
            </p>
            <div className="jester-lore-box">
              "The town fell straight into the Fool's trap. Voted out on the public scaffold, the Jester claims an individual triumph!"
            </div>
            <button
              type="button"
              className="btn btn-primary btn-jester-dismiss"
              onClick={() => setJesterVictoryData(null)}
            >
              <span>Acknowledge Victory</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
