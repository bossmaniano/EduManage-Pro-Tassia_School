// Wrapper around fetch that includes credentials (httpOnly cookie auth)
// Use VITE_API_URL environment variable for production (e.g., https://your-backend.onrender.com)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(url, options = {}) {
  // Prepend API base URL if set (for production)
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  
  const res = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  // Auto-redirect to login for 401 on data endpoints (not auth endpoints)
  if (res.status === 401 && !url.startsWith('/api/auth')) {
    window.location.href = '/login';
    return null;
  }
  return res;
}
