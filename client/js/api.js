// =========================================================
// Mini Social Media App - Client API & Shared Utilities
// =========================================================

// Determine API base URL
const isDirectExpress = window.location.port === '5000' || window.location.pathname.startsWith('/client/');
const API_BASE_URL = window.location.origin.includes('localhost:5000') || window.location.origin.includes('127.0.0.1:5000')
  ? `${window.location.origin}/api`
  : 'http://localhost:5000/api';

// Auth State Management
const TOKEN_KEY = 'mini_social_token';
const USER_KEY = 'mini_social_user';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

const getUser = () => {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const setUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));

const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const logout = () => {
  clearAuth();
  showToast('Logged out successfully.', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 400);
};

// Route Guards
const requireAuth = () => {
  const token = getToken();
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
};

const redirectIfAuth = () => {
  const token = getToken();
  if (token) {
    window.location.href = 'feed.html';
    return true;
  }
  return false;
};

// API Fetch Wrapper
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/signup')) {
        clearAuth();
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1200);
      }
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      return { ok: false, status: response.status, message: errorMsg, data };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    console.error('API Fetch error:', error);
    const msg = error.message.includes('Failed to fetch')
      ? 'Cannot reach backend server. Please make sure the server is running on http://localhost:5000'
      : error.message;
    return { ok: false, status: 0, message: msg };
  }
};

// Toast Notifications
const showToast = (message, type = 'info') => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Format Relative Time (e.g. 5m ago, 2h ago)
const formatRelativeTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Escape HTML for XSS prevention
const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Shared Navbar Renderer
const renderNavbar = (activePage = 'feed') => {
  const navPlaceholder = document.getElementById('navbar-placeholder');
  if (!navPlaceholder) return;

  const currentUser = getUser();
  const avatarUrl = currentUser && currentUser.profilePicture
    ? currentUser.profilePicture
    : 'https://api.dicebear.com/7.x/bottts/svg?seed=user';
  const myProfileUrl = currentUser ? `profile.html?id=${currentUser.id}` : 'profile.html';

  navPlaceholder.innerHTML = `
    <nav class="navbar">
      <div class="nav-container">
        <a href="feed.html" class="nav-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
          </svg>
          <span>SocialLite</span>
        </a>
        <div class="nav-links">
          <a href="feed.html" class="nav-link ${activePage === 'feed' ? 'active' : ''}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>Feed</span>
          </a>
          <a href="${myProfileUrl}" class="nav-link ${activePage === 'profile' ? 'active' : ''}">
            <img src="${avatarUrl}" alt="Avatar" class="nav-avatar" id="nav-user-avatar" />
            <span>Profile</span>
          </a>
          <button id="nav-logout-btn" class="btn-logout" title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  `;

  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
};
