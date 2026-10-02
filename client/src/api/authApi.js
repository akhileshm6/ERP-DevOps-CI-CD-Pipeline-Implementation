import { apiRequest, setToken } from './client';

export async function login(email, password) {
  const result = await apiRequest('/api/auth/login', {
    auth: false,
    method: 'POST',
    body: { email, password },
    errorMessage: 'Sign in failed'
  });
  setToken(result.token);
  return result;
}
