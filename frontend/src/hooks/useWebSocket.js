import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(gameCode, onMessage) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep latest onMessage callback
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!gameCode) return;

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/${encodeURIComponent(gameCode.toUpperCase())}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Start ping interval
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const data = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Auto-reconnect after 2.5 seconds if still active
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2500);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
    }
  }, [gameCode]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  // HTTP Polling fallback when WebSocket is disconnected or in serverless environments (e.g. Vercel)
  useEffect(() => {
    if (!gameCode || isConnected) return;

    let isSubscribed = true;
    let lastStatus = null;
    let lastPlayerCount = -1;

    const poll = async () => {
      try {
        const resp = await fetch(`/api/games/${encodeURIComponent(gameCode.toUpperCase())}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const game = data.game || data;
        if (!isSubscribed || !game) return;

        // Detect player join changes
        if (game.joined_player_count !== undefined && game.joined_player_count !== lastPlayerCount) {
          lastPlayerCount = game.joined_player_count;
          if (onMessageRef.current) {
            onMessageRef.current({
              type: 'PLAYER_JOINED',
              game,
              joined_count: game.joined_player_count,
            });
          }
        }

        // Detect card distribution event
        if (lastStatus && lastStatus !== 'DISTRIBUTED' && game.status === 'DISTRIBUTED') {
          if (onMessageRef.current) {
            onMessageRef.current({
              type: 'DISTRIBUTION_COMPLETE',
              total_players: game.required_players,
            });
          }
        }
        lastStatus = game.status;
      } catch {
        // Ignore background polling network glitches
      }
    };

    poll();
    const interval = setInterval(poll, 1800);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [gameCode, isConnected]);

  return { isConnected };
}
