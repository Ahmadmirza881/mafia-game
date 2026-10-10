const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred.';
    if (typeof data?.detail === 'string') {
      errorMsg = data.detail;
    } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
      errorMsg = data.detail.map(d => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
    } else if (data?.message) {
      errorMsg = data.message;
    } else if (response.statusText) {
      errorMsg = `Server error: ${response.statusText} (${response.status})`;
    }
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  createGame: (requiredPlayers, roles, hostEmail = null, hostPassword = null, gameMode = 'CLASSIC') =>
    request('/api/games', {
      method: 'POST',
      body: JSON.stringify({
        required_players: requiredPlayers,
        game_mode: gameMode,
        roles,
        host_email: hostEmail?.trim() || null,
        host_password: hostPassword?.trim() || null,
      }),
    }),

  hostLogin: (gameCode, hostEmail, hostPassword) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/host-login`, {
      method: 'POST',
      body: JSON.stringify({
        host_email: hostEmail?.trim() || null,
        host_password: hostPassword?.trim(),
      }),
    }),

  getGame: (gameCode) =>
    request(`/api/games/${encodeURIComponent(gameCode)}`),

  getPlayers: (gameCode) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/players`),

  updateRoles: (gameCode, roles, requiredPlayers, hostToken) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/roles`, {
      method: 'PATCH',
      headers: { 'X-Host-Token': hostToken },
      body: JSON.stringify({ roles, required_players: requiredPlayers }),
    }),

  joinGame: (gameCode, playerName) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/join`, {
      method: 'POST',
      body: JSON.stringify({ player_name: playerName }),
    }),

  distributeCards: (gameCode, hostToken) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/distribute`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    }),

  getMyRole: (playerToken) =>
    request('/api/me/role', {
      method: 'GET',
      headers: { 'X-Player-Token': playerToken },
    }),

  closeGame: (gameCode, hostToken) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/close`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    }),

  rematch: (gameCode, hostToken) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/rematch`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    }),

  kickPlayer: (gameCode, playerName, hostToken) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/players/${encodeURIComponent(playerName)}`, {
      method: 'DELETE',
      headers: { 'X-Host-Token': hostToken },
    }),

  eliminatePlayer: (gameCode, playerName, hostToken, reason = 'VOTED_OUT') =>
    request(`/api/games/${encodeURIComponent(gameCode)}/players/${encodeURIComponent(playerName)}/eliminate`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
      body: JSON.stringify({ reason }),
    }),

  revivePlayer: (gameCode, playerName, hostToken) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/players/${encodeURIComponent(playerName)}/revive`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
    }),

  investigatePlayer: (gameCode, targetPlayerName, playerToken) =>
    request(`/api/games/${encodeURIComponent(gameCode)}/investigate`, {
      method: 'POST',
      headers: { 'X-Player-Token': playerToken },
      body: JSON.stringify({ target_player_name: targetPlayerName }),
    }),
};
