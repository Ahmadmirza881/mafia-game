import React, { useState, useEffect, useCallback } from 'react';
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

  // Update browser address bar to show distinct URL for each screen
  const updateBrowserUrl = useCallback((targetView, code = '') => {
    let path = '/';
    if (targetView === 'create') {
      path = '/create';
    } else if (targetView === 'join') {
      path = code ? `/join?code=${encodeURIComponent(code)}` : '/join';
    } else if (targetView === 'host-lobby') {
      path = code ? `/host?code=${encodeURIComponent(code)}` : '/host';
    } else if (targetView === 'player-screen') {
      path = code ? `/player?code=${encodeURIComponent(code)}` : '/player';
    } else if (targetView === 'host-login') {
      path = '/host-login';
    } else {
      path = '/';
    }

    if (window.location.pathname + window.location.search !== path) {
      window.history.pushState({ view: targetView }, '', path);
    }
  }, []);

  // Navigate helper that updates both view state and URL
  const navigateTo = useCallback((newView, code = '') => {
    setView(newView);
    if (code) setJoinCodeParam(code);
    updateBrowserUrl(newView, code);
  }, [updateBrowserUrl]);

  // Initial mount: inspect URL and tab-specific sessionStorage
  useEffect(() => {
    // Clean up any old global localStorage that caused tabs to clash on localhost
    try {
      localStorage.removeItem('mafia_host_session');
      localStorage.removeItem('mafia_player_session');
    } catch {}

    const pathname = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const codeInUrl = params.get('join') || params.get('code') || '';

    // Check tab-specific session storage
    let savedHost = null;
    let savedPlayer = null;
    try {
      const h = sessionStorage.getItem('mafia_host_session');
      if (h) savedHost = JSON.parse(h);
      const p = sessionStorage.getItem('mafia_player_session');
      if (p) savedPlayer = JSON.parse(p);
    } catch (e) {
      console.warn('Session parse error:', e);
    }

    // Determine starting view based on distinct URL path
    if (pathname === '/create') {
      setView('create');
    } else if (pathname === '/join' || codeInUrl) {
      if (codeInUrl) setJoinCodeParam(codeInUrl.toUpperCase());
      setView('join');
    } else if (pathname === '/host') {
      if (savedHost?.game && savedHost?.hostToken) {
        setHostData(savedHost);
        setView('host-lobby');
      } else {
        setView('landing');
        window.history.replaceState({}, '', '/');
      }
    } else if (pathname === '/player') {
      if (savedPlayer?.game && savedPlayer?.sessionToken) {
        setPlayerData(savedPlayer);
        setView('player-screen');
      } else {
        setView('join');
        window.history.replaceState({}, '', codeInUrl ? `/join?code=${codeInUrl}` : '/join');
      }
    } else if (savedHost?.game && savedHost?.hostToken) {
      setHostData(savedHost);
      setView('host-lobby');
      updateBrowserUrl('host-lobby', savedHost.game.game_code);
    } else if (savedPlayer?.game && savedPlayer?.sessionToken) {
      setPlayerData(savedPlayer);
      setView('player-screen');
      updateBrowserUrl('player-screen', savedPlayer.game.game_code);
    } else {
      setView('landing');
      if (pathname !== '/') {
        window.history.replaceState({}, '', '/');
      }
    }

    // Listen to browser Back and Forward navigation buttons
    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      const q = new URLSearchParams(window.location.search);
      const c = q.get('join') || q.get('code') || '';

      if (p === '/create') setView('create');
      else if (p === '/join') {
        if (c) setJoinCodeParam(c.toUpperCase());
        setView('join');
      }
      else if (p === '/host') setView('host-lobby');
      else if (p === '/player') setView('player-screen');
      else setView('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [updateBrowserUrl]);

  // Host creates game
  const handleGameCreated = (game, hostToken) => {
    const session = { game, hostToken };
    setHostData(session);
    try {
      sessionStorage.setItem('mafia_host_session', JSON.stringify(session));
    } catch (e) {}
    setView('host-lobby');
    updateBrowserUrl('host-lobby', game.game_code);
  };

  // Player joins game
  const handlePlayerJoined = ({ game, playerName, sessionToken }) => {
    const session = { game, playerName, sessionToken };
    setPlayerData(session);
    try {
      sessionStorage.setItem('mafia_player_session', JSON.stringify(session));
    } catch (e) {}
    setView('player-screen');
    updateBrowserUrl('player-screen', game.game_code);
  };

  // Exit Host lobby
  const handleHostExit = () => {
    try {
      sessionStorage.removeItem('mafia_host_session');
    } catch (e) {}
    setHostData(null);
    navigateTo('landing');
  };

  // Leave game (Player)
  const handlePlayerLeave = () => {
    try {
      sessionStorage.removeItem('mafia_player_session');
    } catch (e) {}
    setPlayerData(null);
    navigateTo('landing');
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
            onNavigate={(screen) => navigateTo(screen)}
          />
        )}

        {view === 'create' && (
          <CreateGame
            onBack={() => navigateTo('landing')}
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
            onBack={() => navigateTo('landing')}
            onJoined={handlePlayerJoined}
          />
        )}

        {view === 'host-login' && (
          <HostLogin
            onBack={() => navigateTo('landing')}
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
