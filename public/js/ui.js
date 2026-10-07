// UI Utilities and Helpers for ConnectSphere
const ui = {
  // Toast notifications
  showToast: (message, type = 'info', duration = 3200) => {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Generates clean SVG initial avatar for any real user
  getDefaultAvatar: (name = 'User') => {
    const cleanName = (typeof name === 'string' && name.trim()) ? name.trim() : 'User';
    const initial = cleanName.charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f472b6"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#avatarGrad)"/><text x="50%" y="55%" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="46" font-weight="700" fill="#ffffff" dominant-baseline="central" text-anchor="middle">${initial}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  },

  // HTML escaping utility for sanitizing user text safely
  escapeHtml: (str = '') => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Relative timestamp formatter
  formatTimeAgo: (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  // Parse text for hashtags and mentions
  formatTextWithTags: (text) => {
    if (!text) return '';
    // Escape HTML first to prevent XSS
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Replace hashtags
    const withTags = escaped.replace(
      /#([a-zA-Z0-9_]+)/g,
      `<span class="hashtag" onclick="event.stopPropagation(); window.CS_APP.filterByTag('$1')">#$1</span>`
    );

    // Replace mentions
    return withTags.replace(
      /@([a-zA-Z0-9_]+)/g,
      `<span class="mention" onclick="event.stopPropagation(); window.CS_APP.openProfile('$1')">@$1</span>`
    );
  },

  // Modal controls
  openModal: (modalId) => {
    // Automatically close other active overlays so they don't layer or block clicks
    document.querySelectorAll('.modal-overlay.active').forEach((m) => {
      if (m.id !== modalId) m.classList.remove('active');
    });
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      if (window.location.hash === '#login' || window.location.hash === '#register' || window.location.hash === '#signup') {
        try { history.replaceState(null, '', window.location.pathname); } catch (_) {}
      }
    }
  },

  setupModalDismissers: () => {
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    document.querySelectorAll('.modal-close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay') || btn.closest('.story-viewer-modal');
        if (modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  },
};

window.CS_UI = ui;
