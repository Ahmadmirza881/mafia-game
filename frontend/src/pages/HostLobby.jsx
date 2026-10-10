import React, { useState, useEffect, useCallback } from 'react';
import { GameCodeCard } from '../components/GameCodeCard';
import { PlayerList } from '../components/PlayerList';
import { RoleCounter } from '../components/RoleCounter';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { sounds } from '../utils/soundEffects';

const ROLE_ICONS = {
  PLAYERS: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  MAFIA: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 4 10.5 4 15.5C4 18.5 6.5 20.5 9.5 19.5V22H14.5V19.5C17.5 20.5 20 18.5 20 15.5C20 10.5 12 2 12 2Z" />
    </svg>
  ),
  CITIZEN: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  DETECTIVE: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7.5" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  ),
  DOCTOR: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 7V17M7 12H17" strokeWidth="2.5" />
    </svg>
  ),
  GODFATHER: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="rgba(245, 158, 11, 0.2)" />
      <circle cx="12" cy="19" r="2" fill="#f59e0b" />
    </svg>
  ),
  JESTER: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12a10 10 0 0 0 20 0c0-6-4-10-10-10S2 6 2 12z" fill="rgba(192, 132, 252, 0.15)" />
      <path d="M8 10h.01M16 10h.01" strokeWidth="3" />
      <path d="M8 15c2 2 6 2 8 0" />
    </svg>
  ),
  MAYOR: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M6 8l6-5 6 5M6 8L3 14h6L6 8zM18 8l-3 6h6l-3-6z" fill="rgba(251, 191, 36, 0.15)" />
    </svg>
  ),
};

const ROLE_NAMES = {
  MAFIA: 'Mafia',
  CITIZEN: 'Civilian',
  DETECTIVE: 'Detective',
  DOCTOR: 'Doctor',
  GODFATHER: 'Godfather (Don)',
  JESTER: 'Jester (Fool)',
  MAYOR: 'Mayor',
};

export function HostLobby({ initialGame, hostToken, onExit }) {
  const [game, setGame] = useState(initialGame);
  const [players, setPlayers] = useState([]);
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionResult, setDistributionResult] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Settings adjustment modal/panel state
  const [showSettings, setShowSettings] = useState(false);
  const [editPlayerCount, setEditPlayerCount] = useState(initialGame.required_players);
  const [editRoles, setEditRoles] = useState(initialGame.role_counts || { MAFIA: 1, CITIZEN: 2, DETECTIVE: 1, DOCTOR: 1 });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isClosingGame, setIsClosingGame] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [showRematchModal, setShowRematchModal] = useState(false);

  // Elimination modal state
  const [playerToEliminate, setPlayerToEliminate] = useState(null);
  const [eliminationReason, setEliminationReason] = useState('VOTED_OUT');
  const [isEliminating, setIsEliminating] = useState(false);

  // Jester Victory Celebration State
  const [jesterVictoryData, setJesterVictoryData] = useState(null);

  // Town Trial Vote Calculator state
  const [voterTally, setVoterTally] = useState({});
  const [mayorClaimants, setMayorClaimants] = useState({});
  const [showVoteTool, setShowVoteTool] = useState(false);

  const isElite = (game.game_mode || '').toUpperCase() === 'ELITE';

  // Fetch full players list
  const refreshPlayers = useCallback(async () => {
    try {
      const playerList = await api.getPlayers(game.game_code);
      setPlayers(playerList);
    } catch (err) {
      console.warn('Failed to fetch players:', err);
    }
  }, [game.game_code]);

  // Initial load
  useEffect(() => {
    refreshPlayers();
  }, [refreshPlayers]);

  // Keep edit state synced with game updates
  useEffect(() => {
    setEditPlayerCount(game.required_players);
    if (game.role_counts) {
      setEditRoles(game.role_counts);
    }
  }, [game.required_players, game.role_counts]);

  // Handle incoming real-time WebSocket events
  const handleWsMessage = useCallback((data) => {
    if (data.type === 'PLAYER_JOINED') {
      sounds.playPlayerJoined();
      if (data.game) {
        setGame(data.game);
      } else {
        setGame((prev) => ({
          ...prev,
          joined_player_count: data.joined_count,
        }));
      }
      refreshPlayers();
    } else if (data.type === 'GAME_CONFIG_UPDATED') {
      if (data.game) setGame(data.game);
    } else if (data.type === 'DISTRIBUTION_STARTED') {
      setIsDistributing(true);
    } else if (data.type === 'DISTRIBUTION_COMPLETE') {
      sounds.playDramaticReveal();
      setIsDistributing(false);
      setGame((prev) => ({
        ...prev,
        status: 'DISTRIBUTED',
      }));
      setDistributionResult({
        success: true,
        message: `Cards distributed successfully. ${data.total_players} / ${data.total_players} players received cards.`,
      });
      refreshPlayers();
    } else if (data.type === 'REMATCH_STARTED') {
      sounds.playShuffle();
      setIsDistributing(false);
      setDistributionResult(null);
      setJesterVictoryData(null);
      setVoterTally({});
      setMayorClaimants({});
      if (data.game) {
        setGame(data.game);
      } else {
        setGame((prev) => ({
          ...prev,
          status: 'WAITING',
        }));
      }
      setSuccessMsg('Rematch started! All players remain in the room for Round 2.');
      setTimeout(() => setSuccessMsg(''), 4000);
      refreshPlayers();
    } else if (data.type === 'PLAYER_KICKED') {
      refreshPlayers();
      if (data.game) setGame(data.game);
    } else if (data.type === 'PLAYER_STATUS_UPDATED') {
      refreshPlayers();
    } else if (data.type === 'JESTER_VICTORY') {
      sounds.playJesterVictory();
      setJesterVictoryData({
        playerName: data.player_name,
        message: data.message || `🎭 ${data.player_name} (The Jester) has been voted out and achieved an independent victory!`,
      });
    }
  }, [refreshPlayers]);

  const { isConnected } = useWebSocket(game.game_code, handleWsMessage);

  const joinedCount = players.length;
  const isLobbyFull = joinedCount === game.required_players;
  const isCardsValid = game.total_cards === game.required_players;
  const canDistribute = isLobbyFull && isCardsValid && game.status === 'WAITING' && !isDistributing;

  const handleDistribute = async () => {
    if (!canDistribute) return;

    sounds.playShuffle();
    setError('');
    setIsDistributing(true);

    try {
      const resp = await api.distributeCards(game.game_code, hostToken);
      setDistributionResult(resp);
      setGame((prev) => ({
        ...prev,
        status: 'DISTRIBUTED',
      }));
    } catch (err) {
      setError(err.message || 'Failed to distribute cards.');
      setIsDistributing(false);
    }
  };

  // Open Rematch Confirmation Modal
  const handleRematch = () => {
    setShowRematchModal(true);
  };

  // Confirm Rematch
  const confirmRematch = async () => {
    if (isRematching) return;
    setIsRematching(true);
    setError('');
    sounds.playShuffle();

    try {
      await api.rematch(game.game_code, hostToken);
      setDistributionResult(null);
      setJesterVictoryData(null);
      setGame((prev) => ({
        ...prev,
        status: 'WAITING',
      }));
      setShowRematchModal(false);
      setSuccessMsg('Rematch initiated! All players are ready for the new round.');
      setTimeout(() => setSuccessMsg(''), 4000);
      refreshPlayers();
    } catch (err) {
      setError(err.message || 'Failed to start rematch.');
    } finally {
      setIsRematching(false);
    }
  };

  // Kick Player from lobby
  const handleKickPlayer = async (playerName) => {
    if (!window.confirm(`Kick ${playerName} from the lobby?`)) return;
    try {
      await api.kickPlayer(game.game_code, playerName, hostToken);
      refreshPlayers();
      setSuccessMsg(`Player ${playerName} was removed from lobby.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || `Failed to kick ${playerName}.`);
    }
  };

  // Open eliminate modal
  const handleOpenEliminate = (playerName) => {
    setPlayerToEliminate(playerName);
    setEliminationReason('VOTED_OUT');
  };

  // Confirm eliminate with selected reason
  const handleConfirmEliminate = async () => {
    if (!playerToEliminate || isEliminating) return;
    setIsEliminating(true);
    setError('');

    try {
      const res = await api.eliminatePlayer(game.game_code, playerToEliminate, hostToken, eliminationReason);
      refreshPlayers();
      setSuccessMsg(`${playerToEliminate} has been eliminated (${eliminationReason === 'VOTED_OUT' ? 'Town Vote' : 'Night Attack'}).`);
      setTimeout(() => setSuccessMsg(''), 3000);

      if (res.jester_victory) {
        sounds.playJesterVictory();
        setJesterVictoryData({
          playerName: res.player_name,
          message: `🎭 ${res.player_name} (The Jester) has been voted out and achieved an independent victory!`,
        });
      }

      setPlayerToEliminate(null);
    } catch (err) {
      setError(err.message || `Failed to eliminate ${playerToEliminate}.`);
    } finally {
      setIsEliminating(false);
    }
  };

  // Revive eliminated player
  const handleRevivePlayer = async (playerName) => {
    try {
      await api.revivePlayer(game.game_code, playerName, hostToken);
      refreshPlayers();
      setSuccessMsg(`${playerName} has been revived.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || `Failed to revive ${playerName}.`);
    }
  };

  // Close/cancel the game lobby
  const handleCloseGame = async () => {
    if (!window.confirm('Are you sure you want to cancel and close this game lobby? All joined players will return to the home screen.')) {
      return;
    }

    setIsClosingGame(true);
    setError('');

    try {
      await api.closeGame(game.game_code, hostToken);
      onExit();
    } catch (err) {
      setError(err.message || 'Failed to close game.');
      setIsClosingGame(false);
    }
  };

  // Exit lobby via top back link
  const handleHeaderExit = async () => {
    if (window.confirm('Are you sure you want to exit? This will close the room and return all players to the home screen.')) {
      try {
        await api.closeGame(game.game_code, hostToken);
      } catch (err) {
        console.warn('Failed to close game on exit:', err);
      }
      onExit();
    }
  };

  // Save adjusted role counts & required players
  const handleSaveSettings = async (e) => {
    e.preventDefault();

    const allowedKeys = isElite
      ? ['MAFIA', 'CITIZEN', 'DETECTIVE', 'DOCTOR', 'GODFATHER', 'JESTER', 'MAYOR']
      : ['MAFIA', 'CITIZEN', 'DETECTIVE', 'DOCTOR'];

    const filteredRoles = {};
    allowedKeys.forEach((k) => {
      filteredRoles[k] = editRoles[k] || 0;
    });

    const editTotalCards = Object.values(filteredRoles).reduce((a, b) => a + b, 0);

    if (editTotalCards !== editPlayerCount) {
      setError(`Role cards (${editTotalCards}) must equal required players (${editPlayerCount}).`);
      return;
    }

    if (editPlayerCount < joinedCount) {
      setError(`Cannot set required players (${editPlayerCount}) lower than currently joined players (${joinedCount}).`);
      return;
    }

    setIsSavingSettings(true);
    setError('');

    try {
      const updated = await api.updateRoles(game.game_code, filteredRoles, editPlayerCount, hostToken);
      setGame(updated);
      setShowSettings(false);
      setSuccessMsg('Game configuration updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update game configuration.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Town Trial Vote calculations
  const alivePlayers = players.filter((p) => p.is_alive !== false);
  const totalVotesCast = Object.entries(voterTally).reduce((acc, [name, voted]) => {
    if (!voted) return acc;
    const weight = isElite && mayorClaimants[name] ? 2 : 1;
    return acc + weight;
  }, 0);
  const majorityThreshold = Math.floor(alivePlayers.length / 2) + 1;

  const toggleVote = (name) => {
    sounds.playClick();
    setVoterTally((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleMayorClaim = (name) => {
    sounds.playClick();
    setMayorClaimants((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const resetVotes = () => {
    sounds.playClick();
    setVoterTally({});
  };

  const remainingPlayers = game.required_players - joinedCount;
  const activeAllowedKeys = isElite
    ? ['MAFIA', 'CITIZEN', 'DETECTIVE', 'DOCTOR', 'GODFATHER', 'JESTER', 'MAYOR']
    : ['MAFIA', 'CITIZEN', 'DETECTIVE', 'DOCTOR'];
  const editTotalCards = activeAllowedKeys.reduce((a, k) => a + (editRoles[k] || 0), 0);
  const editDiff = editTotalCards - editPlayerCount;

  return (
    <div>
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button type="button" className="back-link" onClick={handleHeaderExit} style={{ margin: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Exit Lobby</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={isElite ? 'mode-pill-elite' : 'mode-pill-classic'}>
            {isElite ? '👑 MAFIA ELITE' : 'MAFIA CLASSIC'}
          </span>

          {game.status === 'DISTRIBUTED' && (
            <button
              type="button"
              className="btn-rematch-icon"
              title="Rematch (Next Round)"
              aria-label="Rematch"
              disabled={isRematching}
              onClick={handleRematch}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={isRematching ? 'spin-icon' : ''}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isConnected ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? 'var(--accent-green)' : 'var(--accent-gold)', display: 'inline-block' }} />
            <span>{isConnected ? 'Realtime Connected' : 'Connecting...'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Distribution Summary after distribute */}
      {(game.status === 'DISTRIBUTED' || distributionResult) && (
        <div className="card" style={{ border: isElite ? '1.5px solid var(--accent-gold)' : '1.5px solid var(--accent-green)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: isElite ? 'var(--accent-gold)' : 'var(--accent-green)', margin: 0 }}>
                Cards Distributed
              </h2>
              <span className={isElite ? 'mode-pill-elite' : 'mode-pill-classic'}>
                {isElite ? '👑 Mafia Elite' : 'Mafia Classic'}
              </span>
            </div>
            <button
              type="button"
              id="btn-rematch-header"
              className="btn-rematch-icon btn-rematch-primary"
              title="Rematch (Next Round)"
              aria-label="Rematch"
              disabled={isRematching}
              onClick={handleRematch}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={isRematching ? 'spin-icon' : ''}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>
            {distributionResult?.message || `Cards distributed successfully. ${game.required_players} / ${game.required_players} players received secret cards.`}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.85rem', background: 'var(--bg-input)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Next Round: Tap the Rematch icon to deal new secret cards. All players remain in this room.
            </div>
            <button
              type="button"
              id="btn-rematch-action"
              className="btn-rematch-icon btn-rematch-primary"
              title="Rematch (Next Round)"
              aria-label="Rematch"
              disabled={isRematching}
              onClick={handleRematch}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={isRematching ? 'spin-icon' : ''}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Responsive Grid Layout */}
      <div className="host-lobby-grid">
        {/* LEFT COLUMN: Game Code, Status & Controls */}
        <div>
          <GameCodeCard gameCode={game.game_code} />

          {game.status !== 'DISTRIBUTED' && !distributionResult && (
            <div className={`card ${isElite ? 'card-elite-border' : ''}`}>
              <div className="card-header">
                <div className="card-title">
                  <span>Lobby Status</span>
                </div>
                <div className={`status-pill ${canDistribute ? 'status-ready' : 'status-waiting'}`}>
                  {canDistribute ? 'Ready to Distribute' : 'Waiting for Players'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-input)', padding: '0.9rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Players Joined
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: '800', marginTop: '0.2rem' }}>
                    {joinedCount} / {game.required_players}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '0.9rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Configured Cards
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: '800', marginTop: '0.2rem' }}>
                    {game.total_cards} / {game.required_players}
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div style={{ marginBottom: '1.25rem' }}>
                {remainingPlayers > 0 ? (
                  <div className="alert alert-warning" style={{ flexDirection: 'column', gap: '0.4rem' }}>
                    <div>
                      <span>Waiting for <strong>{remainingPlayers}</strong> more player{remainingPlayers > 1 ? 's' : ''} to join.</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Want to start with fewer players? Click <strong>Adjust Players & Roles</strong> below to set count to {joinedCount >= 3 ? joinedCount : 3}.
                    </div>
                  </div>
                ) : !isCardsValid ? (
                  <div className="alert alert-error">
                    <span>Role card count ({game.total_cards}) does not match players ({game.required_players}).</span>
                  </div>
                ) : (
                  <div className="alert alert-success">
                    <span>All players joined and cards configured. Ready to distribute.</span>
                  </div>
                )}
              </div>

              {/* Action button: Distribute Cards */}
              <button
                type="button"
                id="btn-distribute-cards"
                className={isElite ? 'btn-create-game-elite' : 'btn-create-game-exact'}
                style={{ fontSize: '1.05rem', padding: '1.05rem', marginBottom: '0.75rem', width: '100%' }}
                disabled={!canDistribute}
                onClick={handleDistribute}
              >
                <span className="btn-icon" style={{ display: 'flex', alignItems: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="15" height="16" rx="2" />
                    <path d="M7 2h13a2 2 0 0 1 2 2v13" />
                  </svg>
                </span>
                <span>{isDistributing ? 'DISTRIBUTING CARDS...' : `DISTRIBUTE ${isElite ? 'ELITE ' : ''}CARDS`}</span>
              </button>

              {/* Host Lobby Controls: Adjust Settings or Cancel Lobby */}
              <div className="host-lobby-actions-grid">
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '0.75rem 1rem' }}
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>{showSettings ? 'Hide Settings' : 'Adjust Players & Roles'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.88rem', padding: '0.75rem 1rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  disabled={isClosingGame}
                  onClick={handleCloseGame}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>{isClosingGame ? 'Closing...' : 'Cancel Game'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ADJUST SETTINGS PANEL */}
          {showSettings && game.status === 'WAITING' && (
            <div className={`card ${isElite ? 'card-elite-border' : ''}`} style={{ border: '1.5px solid var(--accent-gold)' }}>
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '1.05rem' }}>
                  <span>Adjust Player Count & Roles ({isElite ? 'Mafia Elite' : 'Mafia Classic'})</span>
                </div>
                <button
                  type="button"
                  className="btn-action-icon btn-kick-icon"
                  style={{ width: 28, height: 28 }}
                  title="Close Settings"
                  aria-label="Close Settings"
                  onClick={() => setShowSettings(false)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveSettings}>
                <div className="form-group">
                  <label className="form-label">
                    Required Players (Min: {Math.max(3, joinedCount)})
                  </label>
                  <RoleCounter
                    label="Required Players"
                    icon={ROLE_ICONS.PLAYERS}
                    value={editPlayerCount}
                    min={Math.max(3, joinedCount)}
                    max={50}
                    onChange={(val) => setEditPlayerCount(val)}
                  />
                  {joinedCount >= 3 && editPlayerCount !== joinedCount && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', marginTop: '0.4rem', width: 'auto', display: 'inline-flex', gap: '0.4rem' }}
                      onClick={() => setEditPlayerCount(joinedCount)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                      </svg>
                      <span>Set to joined count ({joinedCount} players)</span>
                    </button>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Adjust Roles (Must sum to {editPlayerCount})</label>

                  <RoleCounter
                    label="Mafia"
                    icon={ROLE_ICONS.MAFIA}
                    value={editRoles.MAFIA || 0}
                    min={0}
                    max={editPlayerCount}
                    onChange={(val) => setEditRoles((prev) => ({ ...prev, MAFIA: val }))}
                  />

                  <RoleCounter
                    label="Civilian"
                    icon={ROLE_ICONS.CITIZEN}
                    value={editRoles.CITIZEN || 0}
                    min={0}
                    max={editPlayerCount}
                    onChange={(val) => setEditRoles((prev) => ({ ...prev, CITIZEN: val }))}
                  />

                  <RoleCounter
                    label="Detective"
                    icon={ROLE_ICONS.DETECTIVE}
                    value={editRoles.DETECTIVE || 0}
                    min={0}
                    max={editPlayerCount}
                    onChange={(val) => setEditRoles((prev) => ({ ...prev, DETECTIVE: val }))}
                  />

                  <RoleCounter
                    label="Doctor"
                    icon={ROLE_ICONS.DOCTOR}
                    value={editRoles.DOCTOR || 0}
                    min={0}
                    max={editPlayerCount}
                    onChange={(val) => setEditRoles((prev) => ({ ...prev, DOCTOR: val }))}
                  />

                  {/* Elite Exclusive roles only appear in Elite mode */}
                  {isElite && (
                    <>
                      <RoleCounter
                        label="Godfather (Don)"
                        icon={ROLE_ICONS.GODFATHER}
                        value={editRoles.GODFATHER || 0}
                        min={0}
                        max={editPlayerCount}
                        onChange={(val) => setEditRoles((prev) => ({ ...prev, GODFATHER: val }))}
                      />

                      <RoleCounter
                        label="Jester (Fool)"
                        icon={ROLE_ICONS.JESTER}
                        value={editRoles.JESTER || 0}
                        min={0}
                        max={editPlayerCount}
                        onChange={(val) => setEditRoles((prev) => ({ ...prev, JESTER: val }))}
                      />

                      <RoleCounter
                        label="Mayor (2x Votes)"
                        icon={ROLE_ICONS.MAYOR}
                        value={editRoles.MAYOR || 0}
                        min={0}
                        max={editPlayerCount}
                        onChange={(val) => setEditRoles((prev) => ({ ...prev, MAYOR: val }))}
                      />
                    </>
                  )}
                </div>

                {/* In-Editor Validation Message */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Cards vs Players:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      {editTotalCards} / {editPlayerCount} Cards
                    </strong>
                  </div>

                  {editDiff < 0 && (
                    <div className="alert alert-warning" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                      <span>{Math.abs(editDiff)} card(s) remaining.</span>
                    </div>
                  )}
                  {editDiff > 0 && (
                    <div className="alert alert-error" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                      <span>Too many cards ({editDiff} over limit).</span>
                    </div>
                  )}
                  {editDiff === 0 && (
                    <div className="alert alert-success" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                      <span>Cards match {editPlayerCount} players.</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={editDiff !== 0 || isSavingSettings}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>{isSavingSettings ? 'Saving...' : 'Save & Update Lobby'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSettings(false)}
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TOWN TRIAL VOTE CALCULATOR (Moderator Tool during in-person play) */}
          {game.status === 'DISTRIBUTED' && (
            <div className={`card ${isElite ? 'card-elite-border' : ''}`} style={{ marginTop: '1rem' }}>
              <div className="card-header" style={{ marginBottom: '0.6rem' }}>
                <div className="card-title" style={{ fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚖ Town Trial Vote Assistant</span>
                  {isElite && <span className="mode-pill-elite" style={{ fontSize: '0.7rem' }}>Mayor 2x Vote Weight</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => setShowVoteTool(!showVoteTool)}
                >
                  {showVoteTool ? 'Hide' : 'Open'}
                </button>
              </div>

              {showVoteTool && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Tally votes during day trials. {isElite ? 'In Mafia Elite, tag the revealed Mayor to count their vote as 2!' : 'Each vote adds 1.'}
                  </p>

                  <div className="vote-calculator-grid">
                    {alivePlayers.map((p) => {
                      const isVoted = !!voterTally[p.name];
                      const isClaimingMayor = isElite && !!mayorClaimants[p.name];
                      return (
                        <div key={p.name} className={`vote-tally-item ${isVoted ? 'is-voted' : ''}`}>
                          <button
                            type="button"
                            className={`vote-btn-pill ${isVoted ? 'is-active' : ''}`}
                            onClick={() => toggleVote(p.name)}
                          >
                            <span className="vote-check">{isVoted ? '✓' : '+'}</span>
                            <span className="vote-name">{p.name}</span>
                            <span className="vote-weight-pill">
                              {isClaimingMayor ? '+2' : '+1'}
                            </span>
                          </button>

                          {isElite && (
                            <button
                              type="button"
                              className={`mayor-toggle-chip ${isClaimingMayor ? 'is-mayor' : ''}`}
                              title="Toggle Mayor double voting weight"
                              onClick={() => toggleMayorClaim(p.name)}
                            >
                              ⚖ 2x
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="vote-tally-summary-bar">
                    <div>
                      Votes Cast: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--accent-gold)' }}>{totalVotesCast}</strong>
                    </div>
                    <div>
                      Majority Needed: <strong style={{ fontFamily: 'var(--font-mono)' }}>{majorityThreshold}</strong> ({alivePlayers.length} living)
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                      onClick={resetVotes}
                    >
                      Clear Tally
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Player Roster & Configured Roles Breakdown */}
        <div className="host-lobby-sidebar">
          <PlayerList
            players={players}
            requiredCount={game.required_players}
            isHost={true}
            gameStatus={game.status}
            onKick={handleKickPlayer}
            onEliminate={handleOpenEliminate}
            onRevive={handleRevivePlayer}
          />

          {/* Role configuration summary */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
              <div className="card-title" style={{ fontSize: '0.95rem' }}>
                <span>Configured Roles ({isElite ? 'Mafia Elite' : 'Mafia Classic'})</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {Object.entries(game.role_counts || {}).map(([role, qty]) => (
                <div
                  key={role}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span>{ROLE_NAMES[role] || role}</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{qty}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Elimination Reason Picker */}
      {playerToEliminate && (
        <div className="modal-backdrop" onClick={() => !isEliminating && setPlayerToEliminate(null)}>
          <div className="modal-content eliminate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eliminate-modal-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="12" r="1.5" fill="currentColor"></circle>
                <circle cx="15" cy="12" r="1.5" fill="currentColor"></circle>
                <path d="M8 20v2h8v-2"></path>
                <path d="M12 4a8 8 0 0 0-8 8c0 3 1.5 5.5 4 7v1h8v-1c2.5-1.5 4-4 4-7a8 8 0 0 0-8-8z"></path>
              </svg>
            </div>

            <h3 className="modal-title">Eliminate {playerToEliminate}</h3>
            <p className="modal-subtitle">
              Select the method of elimination to enforce role rules & win conditions:
            </p>

            <div className="elimination-options-grid">
              <label className={`elimination-option-card ${eliminationReason === 'VOTED_OUT' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="elimReason"
                  value="VOTED_OUT"
                  checked={eliminationReason === 'VOTED_OUT'}
                  onChange={() => setEliminationReason('VOTED_OUT')}
                />
                <div className="option-content">
                  <div className="option-title">🏛 Voted Out by Town</div>
                  <div className="option-desc">
                    Eliminated during daytime discussion or trial. {isElite && <strong style={{ color: 'var(--accent-gold)' }}>If Jester, triggers solo victory!</strong>}
                  </div>
                </div>
              </label>

              <label className={`elimination-option-card ${eliminationReason === 'NIGHT_KILL' ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="elimReason"
                  value="NIGHT_KILL"
                  checked={eliminationReason === 'NIGHT_KILL'}
                  onChange={() => setEliminationReason('NIGHT_KILL')}
                />
                <div className="option-content">
                  <div className="option-title">🌙 Night Kill / Other</div>
                  <div className="option-desc">
                    Eliminated overnight by Mafia hit or other means. Jester does NOT win if killed at night.
                  </div>
                </div>
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
                disabled={isEliminating}
                onClick={handleConfirmEliminate}
              >
                <span>{isEliminating ? 'Eliminating...' : 'Confirm Elimination'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isEliminating}
                onClick={() => setPlayerToEliminate(null)}
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Jester Independent Victory Celebration */}
      {jesterVictoryData && (
        <div className="modal-backdrop" onClick={() => setJesterVictoryData(null)}>
          <div className="modal-content jester-victory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="jester-victory-icon">🎭</div>
            <div className="jester-victory-tag">INDEPENDENT VICTORY</div>
            <h2 className="jester-victory-title">THE JESTER WINS!</h2>
            <p className="jester-victory-desc">
              {jesterVictoryData.message || `${jesterVictoryData.playerName} has tricked the town into voting them out!`}
            </p>
            <div className="jester-lore-box">
              "The fool played both the syndicate and the town, orchestrating their own demise to claim the ultimate solo triumph."
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

      {/* Rematch Confirmation Popup Modal */}
      {showRematchModal && (
        <div
          className="modal-backdrop"
          onClick={() => !isRematching && setShowRematchModal(false)}
        >
          <div
            className="modal-content rematch-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rematch-modal-title"
          >
            <div className="rematch-modal-icon">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isRematching ? 'spin-icon' : ''}
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </div>

            <h3 id="rematch-modal-title" className="rematch-modal-title">
              Are you sure you want to rematch?
            </h3>

            <p className="rematch-modal-text">
              This will end the current round and prepare the room for the next round. All joined players will stay in this room.
            </p>

            <div className="rematch-modal-actions">
              <button
                type="button"
                id="btn-confirm-rematch"
                className="btn btn-primary btn-rematch-confirm"
                disabled={isRematching}
                onClick={confirmRematch}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={isRematching ? 'spin-icon' : ''}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>{isRematching ? 'Starting Next Round...' : 'Yes, Rematch'}</span>
              </button>

              <button
                type="button"
                id="btn-cancel-rematch"
                className="btn btn-secondary btn-rematch-cancel"
                disabled={isRematching}
                onClick={() => setShowRematchModal(false)}
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
