// API Base URL - point to backend
const API_BASE_URL = 'https://edumanage-pro-tassia-school.onrender.com';

// Warn if API URL is not set
if (!API_BASE_URL && import.meta.env.MODE === 'production') {
  console.warn('WARNING: VITE_API_URL is not set! API calls may fail in production.');
}
console.log('API Base URL:', API_BASE_URL || '(using relative URLs)');

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
  // Auto-redirect to login for 401 on data endpoints (not auth endpoints)
  if (res.status === 401 && !url.startsWith('/api/auth')) {
    window.location.href = '/login';
    return null;
  }
  return res;
}
