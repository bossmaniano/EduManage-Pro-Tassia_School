// API Base URL - use relative path for production, localhost for development
const isProduction = window.location.hostname !== 'localhost';
const API_BASE_URL = isProduction ? '' : 'http://localhost:10000';

console.log('API Base URL:', API_BASE_URL, '(production:', isProduction, ')');

export async function apiFetch(url, options = {}) {
  // Prepend API base URL if set (for production)
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  console.log(`[API] ${options.method || 'GET'} ${fullUrl}`);
  
  const res = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  // Check if response is OK before returning
  if (!res.ok) {
    console.error(`[API] Error ${res.status}: ${res.statusText}`);
    // Try to parse error response, but handle empty responses
    try {
      const text = await res.text();
      if (text) {
        return new Response(text, { status: res.status, statusText: res.statusText });
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    return res;
  }

  // Auto-redirect to login for 401 on data endpoints (not auth endpoints)
  if (res.status === 401 && !url.startsWith('/api/auth')) {
    window.location.href = '/login';
    return null;
  }

  return res;
}
