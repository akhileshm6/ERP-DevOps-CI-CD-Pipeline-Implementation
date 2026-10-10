const API_BASE = process.env.REACT_APP_API_URL || '';
const TOKEN_KEY = 'token';
export const LOGOUT_EVENT = 'erp:logout';

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    return;
  }
}

/** Decodes the JWT payload; returns null when missing, malformed or expired. */
export function getSessionFromToken(token = getToken()) {
  try {
    const payload = token?.split('.')[1];
    if (!payload) return null;
    const base64Payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(window.atob(base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')));
    if (typeof claims.exp === 'number' && claims.exp <= Date.now() / 1000) return null;

    const role = String(claims.role || '').trim().toLowerCase();
    return {
      id: claims.id,
      name: claims.name || '',
      role: role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'User',
      exp: claims.exp
    };
  } catch {
    return null;
  }
}

export function logout() {
  clearToken();
  window.dispatchEvent(new Event(LOGOUT_EVENT));
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * fetch wrapper: attaches the bearer token and parses JSON. With auth (the default),
 * a 401/403 clears the session and fires LOGOUT_EVENT.
 */
export async function apiRequest(path, { auth = true, method = 'GET', body, errorMessage = 'Request failed' } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (auth && (res.status === 401 || res.status === 403)) logout();
    throw new ApiError(errorData.error || `${errorMessage} (${res.status})`, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}
