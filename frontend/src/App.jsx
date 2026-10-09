import React, { useState, useEffect } from 'react';
import { Landing } from './pages/Landing';
import { CreateGame } from './pages/CreateGame';
import { HostLobby } from './pages/HostLobby';
import { JoinGame } from './pages/JoinGame';
import { PlayerScreen } from './pages/PlayerScreen';
import { HostLogin } from './pages/HostLogin';
import { MafiaLogo } from './components/MafiaLogo';

export default function App() {
  const [view, setView] = useState('landing'); // landing, create, host-lobby, join, player-screen, host-login
  const [hostData, setHostData] = useState(null); // { game, hostToken }
  const [playerData, setPlayerData] = useState(null); // { game, playerName, sessionToken }
  const [joinCodeParam, setJoinCodeParam] = useState('');

  // Check URL query parameters and local session storage on initial mount
  useEffect(() => {
    // 1. Check for ?join=CODE in URL
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join') || params.get('code');
    if (joinCode) {
      setJoinCodeParam(joinCode.toUpperCase());
      setView('join');
      return;
    }

    // 2. Check for saved host session
    try {
      const savedHost = sessionStorage.getItem('mafia_host_session');
      if (savedHost) {
        const parsed = JSON.parse(savedHost);
        if (parsed?.game && parsed?.hostToken) {
          setHostData(parsed);
          setView('host-lobby');
          return;
        }
      }

      // 3. Check for saved player session
      const savedPlayer = sessionStorage.getItem('mafia_player_session');
      if (savedPlayer) {
        const parsed = JSON.parse(savedPlayer);
        if (parsed?.game && parsed?.sessionToken) {
          setPlayerData(parsed);
          setView('player-screen');
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to restore session from storage:', e);
    }
  }, []);

  // Host creates game
  const handleGameCreated = (game, hostToken) => {
    const session = { game, hostToken };
    setHostData(session);
    try {
      sessionStorage.setItem('mafia_host_session', JSON.stringify(session));
    } catch (e) {}
    setView('host-lobby');
  };

  // Player joins game
  const handlePlayerJoined = ({ game, playerName, sessionToken }) => {
    const session = { game, playerName, sessionToken };
    setPlayerData(session);
    try {
      sessionStorage.setItem('mafia_player_session', JSON.stringify(session));
    } catch (e) {}
    setView('player-screen');
  };

  // Exit Host lobby
  const handleHostExit = () => {
    try {
      sessionStorage.removeItem('mafia_host_session');
    } catch (e) {}
    setHostData(null);
    setView('landing');
  };

  // Leave game (Player)
  const handlePlayerLeave = () => {
    try {
      sessionStorage.removeItem('mafia_player_session');
    } catch (e) {}
    setPlayerData(null);
    setView('landing');
  };

  return (
    <div className="app-wrapper">
      {/* Header (displayed on inner pages; Landing page contains its own full-size hero logo) */}
      {view !== 'landing' && (
        <header className="app-header">
          <MafiaLogo size="compact" />
        </header>
      )}

      {/* Main Content Pages */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {view === 'landing' && (
          <Landing
            onNavigate={(screen) => setView(screen)}
          />
        )}

        {view === 'create' && (
          <CreateGame
            onBack={() => setView('landing')}
            onGameCreated={handleGameCreated}
          />
        )}

        {view === 'host-lobby' && hostData && (
          <HostLobby
            initialGame={hostData.game}
            hostToken={hostData.hostToken}
            onExit={handleHostExit}
          />
        )}

        {view === 'join' && (
          <JoinGame
            defaultGameCode={joinCodeParam}
            onBack={() => setView('landing')}
            onJoined={handlePlayerJoined}
          />
        )}

        {view === 'host-login' && (
          <HostLogin
            onBack={() => setView('landing')}
            onHostLoggedIn={handleGameCreated}
          />
        )}

        {view === 'player-screen' && playerData && (
          <PlayerScreen
            initialGame={playerData.game}
            playerName={playerData.playerName}
            sessionToken={playerData.sessionToken}
            onLeave={handlePlayerLeave}
          />
        )}
      </main>
    </div>
  );
}
