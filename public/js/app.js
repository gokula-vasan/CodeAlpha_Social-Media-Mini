// Main Application Coordinator for ConnectSphere
const app = {
  currentTheme: 'dark',
  searchDebounceTimer: null,

  init: async () => {
    console.log('🌐 Initializing ConnectSphere Social Platform...');

    // 1. Setup Theme
    app.initTheme();

    // 2. Setup Modals
    window.CS_UI.setupModalDismissers();

    // 3. Setup Controllers Handlers
    window.CS_AUTH.setupAuthHandlers();
    window.CS_POSTS.setupCreatePostHandlers();
    window.CS_STORIES.setupCreateStoryHandlers();
    window.CS_PROFILE.setupEditProfileHandler();
    app.setupGlobalEvents();

    // 4. Initialize Auth Session
    await window.CS_AUTH.initAuthSession();

    // 5. Load Initial Data
    await Promise.all([
      app.loadStories(),
      app.loadFeed(),
      app.loadSuggestions(),
      app.loadTrendingTopics(),
      app.checkNotifications(),
    ]);

    console.log('✅ ConnectSphere Ready!');
  },

  // Theme Management
  initTheme: () => {
    const savedTheme = localStorage.getItem('cs_theme') || 'dark';
    app.setTheme(savedTheme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const nextTheme = app.currentTheme === 'dark' ? 'light' : 'dark';
        app.setTheme(nextTheme);
      });
    }
  },

  setTheme: (theme) => {
    app.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cs_theme', theme);

    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');

    if (icon) {
      icon.innerHTML =
        theme === 'dark'
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    }
    if (text) {
      text.innerText = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
  },

  // Load Feed Posts
  loadFeed: async () => {
    try {
      const feedType = window.CS_STATE.feedType;
      const tag = window.CS_STATE.activeTag;
      const res = await window.CS_API.posts.getFeed(feedType, tag);

      window.CS_STATE.setPosts(res.posts || []);
      window.CS_POSTS.renderFeed(window.CS_STATE.posts);
    } catch (err) {
      console.error('Failed to load feed:', err);
      window.CS_UI.showToast('Could not load feed posts', 'error');
    }
  },

  // Switch Feed Tab (For You / Following)
  switchFeedTab: (type) => {
    window.CS_STATE.feedType = type;
    document.querySelectorAll('.feed-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.feed === type);
    });

    if (type === 'following' && !window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Log in to see posts from creators you follow', 'info');
      // Reset back to for you visually until logged in
      app.switchFeedTab('foryou');
      return;
    }

    app.loadFeed();
  },

  // Filter by Hashtag
  filterByTag: (tag) => {
    window.CS_PROFILE.showFeedView();
    window.CS_STATE.activeTag = tag;

    const filterBar = document.getElementById('filterBadgeBar');
    const filterTagEl = document.getElementById('filterTagName');

    if (filterBar && filterTagEl) {
      filterTagEl.innerText = `#${tag}`;
      filterBar.classList.add('active');
    }

    app.loadFeed();
  },

  // Clear Hashtag Filter
  clearFilter: () => {
    window.CS_STATE.activeTag = '';
    const filterBar = document.getElementById('filterBadgeBar');
    if (filterBar) filterBar.classList.remove('active');
    app.loadFeed();
  },

  // Load Stories
  loadStories: async () => {
    try {
      const res = await window.CS_API.stories.getAll();
      window.CS_STATE.storiesGrouped = res.data || [];
      window.CS_STORIES.renderStoriesBar(window.CS_STATE.storiesGrouped);
    } catch (err) {
      console.warn('Failed to load stories:', err.message);
    }
  },

  // Load Suggestions Widget
  loadSuggestions: async () => {
    try {
      const res = await window.CS_API.users.getSuggestions();
      window.CS_STATE.suggestions = res.suggestions || [];
      app.renderSuggestions(window.CS_STATE.suggestions);
    } catch (err) {
      console.warn('Failed to load suggestions:', err.message);
    }
  },

  renderSuggestions: (users) => {
    const container = document.getElementById('suggestionsContainer');
    if (!container) return;

    if (!users || users.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No suggestions right now</p>`;
      return;
    }

    container.innerHTML = users
      .slice(0, 5)
      .map(
        (u) => `
      <div class="suggestion-item">
        <div class="suggestion-user-info" onclick="window.CS_APP.openProfile('${u.username}')">
          <img src="${u.avatar || window.CS_UI.getDefaultAvatar(u.name)}" alt="${u.name}" class="avatar avatar-sm">
          <div class="suggestion-meta">
            <span class="suggestion-name">${u.name}</span>
            <span class="suggestion-username">@${u.username}</span>
          </div>
        </div>
        <button class="btn-follow-toggle follow" onclick="window.CS_APP.toggleFollowUser(event, '${u._id}', this)">
          Follow
        </button>
      </div>
    `
      )
      .join('');
  },

  // Load Real Trending Topics
  loadTrendingTopics: async () => {
    try {
      const res = await window.CS_API.posts.getTrendingTags();
      const tags = res.tags || [];
      app.renderTrendingTopics(tags);
    } catch (err) {
      console.warn('Failed to load trending topics:', err.message);
    }
  },

  renderTrendingTopics: (tags) => {
    const container = document.getElementById('trendingListContainer');
    if (!container) return;

    if (!tags || tags.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 8px 0;">No trending topics yet</p>`;
      return;
    }

    container.innerHTML = tags
      .map(
        (item) => `
      <div class="trending-item" onclick="window.CS_APP.filterByTag('${item.tag}')">
        <span class="trending-category">Trending Topic</span>
        <span class="trending-tag">#${item.tag}</span>
        <span class="trending-count">${item.count} ${item.count === 1 ? 'post' : 'posts'}</span>
      </div>
    `
      )
      .join('');
  },

  // Toggle follow from widget or search
  toggleFollowUser: async (event, userId, btnElement) => {
    event.stopPropagation();
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to follow creators', 'info');
      return;
    }

    try {
      const res = await window.CS_API.users.toggleFollow(userId);
      if (res.isFollowing) {
        btnElement.className = 'btn-follow-toggle following';
        btnElement.innerText = 'Following';
      } else {
        btnElement.className = 'btn-follow-toggle follow';
        btnElement.innerText = 'Follow';
      }
      window.CS_UI.showToast(res.message, 'success');
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Open User Profile
  openProfile: (username) => {
    const targetUsername = username || window.CS_STATE.currentUser?.username;
    if (!targetUsername) {
      window.CS_AUTH.openAuthModal('login');
      return;
    }
    window.CS_PROFILE.loadProfile(targetUsername);
  },

  // Notifications
  checkNotifications: async () => {
    if (!window.CS_STATE.isLoggedIn()) return;
    try {
      const res = await window.CS_API.notifications.get();
      const badge = document.getElementById('notifBadge');
      const mobileBadge = document.getElementById('mobileNotifBadge');

      if (res.unreadCount > 0) {
        if (badge) {
          badge.innerText = res.unreadCount;
          badge.style.display = 'inline-flex';
        }
        if (mobileBadge) {
          mobileBadge.innerText = res.unreadCount;
          mobileBadge.style.display = 'inline-flex';
        }
      } else {
        if (badge) badge.style.display = 'none';
        if (mobileBadge) mobileBadge.style.display = 'none';
      }

      app.renderNotifications(res.notifications);
    } catch (err) {
      console.warn('Notifications check error:', err.message);
    }
  },

  renderNotifications: (notifs) => {
    const list = document.getElementById('notificationsList');
    if (!list) return;

    if (!notifs || notifs.length === 0) {
      list.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.88rem; padding: 20px 0;">No notifications yet</p>`;
      return;
    }

    list.innerHTML = notifs
      .map(
        (n) => `
      <div class="notification-item ${!n.isRead ? 'unread' : ''}">
        <img src="${n.sender?.avatar || window.CS_UI.getDefaultAvatar(n.sender?.name || 'User')}" class="avatar avatar-sm" alt="User">
        <div class="notification-text">
          <strong>@${n.sender?.username || 'someone'}</strong> ${n.text || 'interacted with your content'}
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
            ${window.CS_UI.formatTimeAgo(n.createdAt)}
          </div>
        </div>
      </div>
    `
      )
      .join('');
  },

  toggleNotifications: async () => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      return;
    }

    const dropdown = document.getElementById('notificationsDropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('show');

    if (dropdown.classList.contains('show')) {
      await window.CS_API.notifications.markRead();
      const badge = document.getElementById('notifBadge');
      const mobileBadge = document.getElementById('mobileNotifBadge');
      if (badge) badge.style.display = 'none';
      if (mobileBadge) mobileBadge.style.display = 'none';
    }
  },

  // Search Creator or Tag Modal
  openSearchModal: () => {
    window.CS_UI.openModal('searchModal');
    const input = document.getElementById('creatorSearchInput');
    if (input) {
      input.value = '';
      input.focus();
    }
    const results = document.getElementById('searchResultsContainer');
    if (results) results.innerHTML = '';
  },

  handleLiveSearch: (query) => {
    clearTimeout(app.searchDebounceTimer);
    const container = document.getElementById('searchResultsContainer');
    if (!container) return;

    if (!query || query.trim().length < 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `<p style="padding: 12px; color: var(--text-muted); font-size: 0.88rem;">Searching...</p>`;

    app.searchDebounceTimer = setTimeout(async () => {
      try {
        const res = await window.CS_API.users.search(query.trim());
        const users = res.users || [];

        if (users.length === 0) {
          container.innerHTML = `<p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No creators found matching "${query}"</p>`;
          return;
        }

        container.innerHTML = users
          .map(
            (u) => `
          <div class="suggestion-item" style="padding: 8px; border-radius: var(--radius-sm); cursor: pointer;" onclick="window.CS_UI.closeModal('searchModal'); window.CS_APP.openProfile('${u.username}')">
            <div class="suggestion-user-info">
              <img src="${u.avatar || window.CS_UI.getDefaultAvatar(u.name)}" alt="${u.name}" class="avatar avatar-sm">
              <div class="suggestion-meta">
                <span class="suggestion-name">${u.name}</span>
                <span class="suggestion-username">@${u.username}</span>
              </div>
            </div>
            <span style="font-size: 0.8rem; color: #3b82f6;">View Profile →</span>
          </div>
        `
          )
          .join('');
      } catch (err) {
        container.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem; padding: 12px;">Search failed</p>`;
      }
    }, 300);
  },

  // Setup Global Events & Navigation
  setupGlobalEvents: () => {
    // Navigation click routing
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.nav;
        if (target === 'feed') {
          window.CS_PROFILE.showFeedView();
        } else if (target === 'explore' || target === 'search') {
          app.openSearchModal();
        } else if (target === 'create') {
          window.CS_POSTS.openCreateModal();
        } else if (target === 'notifications') {
          app.toggleNotifications();
        } else if (target === 'profile') {
          app.openProfile();
        }
      });
    });

    // User menu pill dropdown toggle
    const userPill = document.getElementById('sidebarUserPill');
    const userDropdown = document.getElementById('userMenuDropdown');
    if (userPill && userDropdown) {
      userPill.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });
    }

    // Close open menus when clicking outside
    document.addEventListener('click', (e) => {
      if (userDropdown && !userDropdown.contains(e.target) && !userPill?.contains(e.target)) {
        userDropdown.classList.remove('show');
      }

      const notifDropdown = document.getElementById('notificationsDropdown');
      if (
        notifDropdown &&
        !notifDropdown.contains(e.target) &&
        !e.target.closest('[data-nav="notifications"]')
      ) {
        notifDropdown.classList.remove('show');
      }

      document.querySelectorAll('.post-menu-dropdown.show').forEach((menu) => {
        if (!menu.contains(e.target) && !e.target.closest('.post-more-btn')) {
          menu.classList.remove('show');
        }
      });
    });

    // Search input typing
    const searchInput = document.getElementById('creatorSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        app.handleLiveSearch(e.target.value);
      });
    }
  },
};

window.CS_APP = app;

document.addEventListener('DOMContentLoaded', () => {
  window.CS_APP.init();
});
