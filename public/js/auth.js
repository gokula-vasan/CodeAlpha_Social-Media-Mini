// Authentication Controller for ConnectSphere
const authController = {
  currentTab: 'login',

  // Open auth modal
  openAuthModal: (tab = 'login', prefillUsername = '') => {
    authController.switchAuthTab(tab);
    if (prefillUsername) {
      const input = document.getElementById('loginIdentifierInput');
      if (input) input.value = prefillUsername;
      const pwInput = document.getElementById('loginPasswordInput');
      if (pwInput) {
        pwInput.value = '';
        setTimeout(() => pwInput.focus(), 150);
      }
    }
    window.CS_UI.openModal('authModal');
  },

  // Switch between Login and Register tabs
  switchAuthTab: (tab) => {
    authController.currentTab = tab;
    document.querySelectorAll('.auth-tab').forEach((el) => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm && registerForm) {
      if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
      }
    }
  },

  // Multi-Account Management
  getSavedAccounts: () => {
    try {
      return JSON.parse(localStorage.getItem('cs_saved_accounts') || '[]');
    } catch (_) {
      return [];
    }
  },

  saveAccount: (token, user) => {
    if (!token || !user) return;
    const accounts = authController.getSavedAccounts();
    const idx = accounts.findIndex((a) => a.user._id === user._id);
    const item = { token, user };
    if (idx >= 0) {
      accounts[idx] = item;
    } else {
      accounts.push(item);
    }
    localStorage.setItem('cs_saved_accounts', JSON.stringify(accounts));
  },

  removeSavedAccount: (userId) => {
    const accounts = authController.getSavedAccounts().filter((a) => a.user._id !== userId);
    localStorage.setItem('cs_saved_accounts', JSON.stringify(accounts));
    authController.renderSwitchAccountsList();
  },

  // Switch active account (1-click or login prompt)
  switchToAccount: async (userId, username) => {
    const saved = authController.getSavedAccounts().find((a) => a.user._id === userId);
    if (saved && saved.token) {
      // Direct instant switch
      localStorage.setItem('cs_token', saved.token);
      window.CS_STATE.setCurrentUser(saved.user);
      authController.updateAuthUI(saved.user);
      window.CS_UI.closeModal('switchAccountModal');

      const dropdown = document.getElementById('userMenuDropdown');
      if (dropdown) dropdown.classList.remove('show');

      // Refresh all state cleanly
      window.CS_PROFILE.showFeedView();
      window.CS_APP.switchFeedTab('foryou');
      window.CS_APP.loadStories();
      window.CS_APP.loadFeed();
      window.CS_APP.loadSuggestions();
      window.CS_APP.checkNotifications();

      window.CS_UI.showToast(`Switched to ${saved.user.name} (@${saved.user.username})! ✨`, 'success');
    } else {
      // Needs password
      window.CS_UI.closeModal('switchAccountModal');
      authController.openAuthModal('login', username);
      window.CS_UI.showToast(`Please enter password for @${username}`, 'info');
    }
  },

  // Open switch accounts modal
  openSwitchModal: async () => {
    const dropdown = document.getElementById('userMenuDropdown');
    if (dropdown) dropdown.classList.remove('show');

    window.CS_UI.openModal('switchAccountModal');
    await authController.renderSwitchAccountsList();
  },

  // Render accounts list in switchAccountModal
  renderSwitchAccountsList: async () => {
    const container = document.getElementById('switchAccountsList');
    if (!container) return;

    container.innerHTML = `<p style="padding: 12px; color: var(--text-muted); font-size: 0.88rem; text-align: center;">Loading accounts...</p>`;

    try {
      const savedList = authController.getSavedAccounts();
      const currentUserId = window.CS_STATE.currentUser?._id;

      // Fetch all registered accounts from backend for complete discovery
      let allRegistered = [];
      try {
        const res = await window.CS_API.users.getAll();
        if (res && res.accounts) allRegistered = res.accounts;
      } catch (_) {}

      if (allRegistered.length === 0) {
        try {
          const sRes = await window.CS_API.users.search('a');
          if (sRes && sRes.users) allRegistered = sRes.users;
        } catch (_) {}
      }

      // Combine accounts
      const accountsMap = new Map();

      // First add all saved accounts
      savedList.forEach((s) => {
        accountsMap.set(s.user._id, {
          _id: s.user._id,
          name: s.user.name,
          username: s.user.username,
          avatar: s.user.avatar,
          hasSavedToken: true,
        });
      });

      // Then add any other registered accounts
      allRegistered.forEach((u) => {
        if (!accountsMap.has(u._id)) {
          accountsMap.set(u._id, {
            _id: u._id,
            name: u.name,
            username: u.username,
            avatar: u.avatar,
            hasSavedToken: false,
          });
        }
      });

      const accounts = Array.from(accountsMap.values());

      if (accounts.length === 0) {
        container.innerHTML = `
          <p style="padding: 16px; color: var(--text-muted); font-size: 0.9rem; text-align: center;">
            No other accounts found. Log in below!
          </p>
        `;
        return;
      }

      container.innerHTML = accounts
        .map((acc) => {
          const isActive = currentUserId && acc._id === currentUserId;
          const avatarSrc = acc.avatar || window.CS_UI.getDefaultAvatar(acc.name);

          return `
            <div class="switch-account-item ${isActive ? 'active' : ''}">
              <img src="${avatarSrc}" alt="${acc.name}" class="avatar avatar-md">
              <div class="switch-account-info" onclick="window.CS_AUTH.switchToAccount('${acc._id}', '${acc.username}')" style="cursor: pointer;">
                <span class="switch-account-name">${acc.name}</span>
                <span class="switch-account-username">@${acc.username}</span>
              </div>
              <div>
                ${
                  isActive
                    ? `<span class="switch-account-badge">✓ Active</span>`
                    : `
                    <button class="btn btn-primary btn-sm" onclick="window.CS_AUTH.switchToAccount('${acc._id}', '${acc.username}')">
                      ${acc.hasSavedToken ? 'Switch' : 'Log In'}
                    </button>
                  `
                }
              </div>
            </div>
          `;
        })
        .join('');
    } catch (err) {
      container.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem; padding: 12px;">Failed to load accounts</p>`;
    }
  },

  // Initialize Auth state from localStorage
  initAuthSession: async () => {
    const token = localStorage.getItem('cs_token');
    if (!token) {
      authController.updateAuthUI(null);
      return;
    }

    try {
      const res = await window.CS_API.auth.getMe();
      window.CS_STATE.setCurrentUser(res.user);
      authController.saveAccount(token, res.user);
      authController.updateAuthUI(res.user);
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      authController.logout(false);
    }
  },

  // Update UI components when auth state changes
  updateAuthUI: (user) => {
    const userPill = document.getElementById('sidebarUserPill');
    const userWidget = document.getElementById('rightUserWidget');
    const loginPromptBtn = document.getElementById('sidebarLoginBtn');
    const composerAvatar = document.getElementById('composerUserAvatar');
    const storyAddAvatar = document.querySelector('.story-add-wrapper img');

    if (user) {
      if (userPill) userPill.style.display = 'flex';
      if (loginPromptBtn) loginPromptBtn.style.display = 'none';

      // Update sidebar user pill
      const pillAvatar = document.getElementById('userPillAvatar');
      const pillName = document.getElementById('userPillName');
      const pillUsername = document.getElementById('userPillUsername');

      const effectiveAvatar = user.avatar || window.CS_UI.getDefaultAvatar(user.name);

      if (pillAvatar) pillAvatar.src = effectiveAvatar;
      if (pillName) pillName.innerText = user.name;
      if (pillUsername) pillUsername.innerText = `@${user.username}`;

      // Update right widget
      if (userWidget) {
        userWidget.innerHTML = `
          <div class="user-widget-profile" onclick="window.CS_APP.openProfile('${user.username}')" style="cursor: pointer;">
            <img src="${effectiveAvatar}" alt="${user.name}" class="avatar avatar-md">
            <div style="display: flex; flex-direction: column; overflow: hidden; line-height: 1.25;">
              <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${user.name}</span>
              <span style="font-size: 0.82rem; color: var(--text-muted);">@${user.username}</span>
            </div>
            <button class="btn btn-secondary btn-sm" style="margin-left: auto;" onclick="event.stopPropagation(); window.CS_AUTH.openSwitchModal()">
              Switch
            </button>
          </div>
        `;
      }

      if (composerAvatar) {
        composerAvatar.innerHTML = `<img src="${effectiveAvatar}" alt="${user.name}" class="avatar avatar-sm">`;
      }
      if (storyAddAvatar) storyAddAvatar.src = effectiveAvatar;
    } else {
      if (userPill) userPill.style.display = 'none';
      if (loginPromptBtn) loginPromptBtn.style.display = 'flex';
      if (composerAvatar) {
        composerAvatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      }

      if (userWidget) {
        userWidget.innerHTML = `
          <div style="text-align: center; padding: 10px 0;">
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">
              Sign in to share posts, follow creators, and save inspirations.
            </p>
            <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="window.CS_AUTH.openAuthModal('login')">
              Log In to ConnectSphere
            </button>
          </div>
        `;
      }
    }
  },

  // Perform Login
  login: async (identifier, password) => {
    try {
      const res = await window.CS_API.auth.login(identifier, password);
      localStorage.setItem('cs_token', res.token);
      authController.saveAccount(res.token, res.user);
      window.CS_STATE.setCurrentUser(res.user);
      authController.updateAuthUI(res.user);
      window.CS_UI.closeModal('authModal');
      window.CS_UI.closeModal('switchAccountModal');

      const dropdown = document.getElementById('userMenuDropdown');
      if (dropdown) dropdown.classList.remove('show');

      window.CS_UI.showToast(`Welcome back, ${res.user.name}! 👋`, 'success');

      // Refresh feed view & load data
      window.CS_PROFILE.showFeedView();
      window.CS_APP.switchFeedTab('foryou');
      window.CS_APP.loadStories();
      window.CS_APP.loadFeed();
      window.CS_APP.loadSuggestions();
      window.CS_APP.checkNotifications();
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Perform Logout
  logout: (showNotification = true) => {
    localStorage.removeItem('cs_token');
    window.CS_STATE.setCurrentUser(null);
    authController.updateAuthUI(null);

    // Close user dropdown if open
    const dropdown = document.getElementById('userMenuDropdown');
    if (dropdown) dropdown.classList.remove('show');

    if (showNotification) {
      window.CS_UI.showToast('You have been logged out', 'info');
    }

    // Refresh feed in public view
    window.CS_PROFILE.showFeedView();
    window.CS_APP.switchFeedTab('foryou');
    window.CS_APP.loadStories();
    window.CS_APP.loadFeed();
    window.CS_APP.loadSuggestions();
  },

  // Setup form event listeners
  setupAuthHandlers: () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('loginIdentifierInput').value.trim();
        const password = document.getElementById('loginPasswordInput').value.trim();
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!identifier || !password) {
          window.CS_UI.showToast('Please enter both email/username and password', 'error');
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Logging in...';
          }
          await authController.login(identifier, password);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Log In';
          }
        }
      });
    }

    // Register Form Submit
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regNameInput').value.trim();
        const username = document.getElementById('regUsernameInput').value.trim();
        const email = document.getElementById('regEmailInput').value.trim();
        const password = document.getElementById('regPasswordInput').value.trim();
        const bio = document.getElementById('regBioInput').value.trim();
        const submitBtn = registerForm.querySelector('button[type="submit"]');

        if (!name || !username || !email || !password) {
          window.CS_UI.showToast('Please fill in all required fields', 'error');
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Creating account...';
          }

          const res = await window.CS_API.auth.register({
            name,
            username,
            email,
            password,
            bio,
          });

          localStorage.setItem('cs_token', res.token);
          authController.saveAccount(res.token, res.user);
          window.CS_STATE.setCurrentUser(res.user);
          authController.updateAuthUI(res.user);
          window.CS_UI.closeModal('authModal');
          window.CS_UI.closeModal('switchAccountModal');

          const dropdown = document.getElementById('userMenuDropdown');
          if (dropdown) dropdown.classList.remove('show');

          window.CS_UI.showToast(`Welcome to ConnectSphere, ${res.user.name}! 🚀`, 'success');

          window.CS_PROFILE.showFeedView();
          window.CS_APP.switchFeedTab('foryou');
          window.CS_APP.loadStories();
          window.CS_APP.loadFeed();
          window.CS_APP.loadSuggestions();
          window.CS_APP.checkNotifications();
        } catch (err) {
          window.CS_UI.showToast(err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Create Account';
          }
        }
      });
    }
  },
};

window.CS_AUTH = authController;
