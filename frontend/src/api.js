const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function apiRequest(url, options = {}) {
  const headers = { ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${apiBaseUrl}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'The request could not be completed.');
  }
  return data;
}