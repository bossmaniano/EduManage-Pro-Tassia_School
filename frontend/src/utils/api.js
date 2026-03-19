// API Base URL - detect environment automatically
// Use VITE_API_URL environment variable if available (set by Render)
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
const isVercel = hostname.includes('vercel.app');

// Try to use environment variable first (for Render deployment)
// VITE_ prefix is required for Vite to expose env vars to client code
let API_BASE_URL = import.meta.env.VITE_API_URL || '';

if (!API_BASE_URL) {
  if (isLocalhost) {
    API_BASE_URL = 'http://localhost:10000';
  } else if (isVercel) {
    API_BASE_URL = ''; // Use relative URL on Vercel (same origin)
  } else {
    // For other production environments (like Render), this shouldn't happen
    // if VITE_API_URL is properly set in render.yaml
    console.warn('API_BASE_URL not set - API calls may fail');
    API_BASE_URL = '';
  }
}

console.log('API Base URL:', API_BASE_URL, '(hostname:', hostname, ')');

// Track if we're already showing a timeout message
let isShowingTimeoutMessage = false;

export async function apiFetch(url, options = {}) {
  // Prepend API base URL if set (for production)
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  console.log(`[API] ${options.method || 'GET'} ${fullUrl}`);

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000); // 10 second timeout

  try {
    const res = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    clearTimeout(timeoutId);

    // Check if response is OK before returning
    if (!res.ok) {
      console.error(`[API] Error ${res.status}: ${res.statusText}`);

      // Handle 409 Conflict - show warning to user
      if (res.status === 409) {
        alert('Conflict Detected: Another teacher has just updated these marks. Please refresh the page to see the latest changes.');
      }

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
  } catch (error) {
    clearTimeout(timeoutId);

    // Check if it's a timeout error
    if (error.name === 'AbortError' && !isShowingTimeoutMessage) {
      isShowingTimeoutMessage = true;
      alert('The system is currently busy. Please do not refresh; your data is being processed.');
      setTimeout(() => {
        isShowingTimeoutMessage = false;
      }, 15000); // Reset after 15 seconds
    }

    // Re-throw the error so the caller can handle it
    throw error;
  }
}
