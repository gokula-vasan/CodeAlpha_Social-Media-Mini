// Profile Controller for ConnectSphere
const profileController = {
  currentProfileUsername: null,
  profilePosts: [],
  savedPosts: [],

  // Load and display profile page
  loadProfile: async (username) => {
    try {
      const res = await window.CS_API.users.getProfile(username);
      profileController.currentProfileUsername = username;
      window.CS_STATE.currentProfileUser = res.user;
      profileController.profilePosts = res.posts || [];

      // Switch view
      profileController.showProfileView(res.user, res.posts);
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Show profile container and hide feed container
  showProfileView: (user, posts) => {
    const feedContainer = document.getElementById('feedViewContainer');
    const profileContainer = document.getElementById('profileViewContainer');

    if (feedContainer) feedContainer.style.display = 'none';
    if (profileContainer) {
      profileContainer.style.display = 'block';
      profileContainer.classList.add('active');
    }

    profileController.renderProfileHeader(user);
    profileController.renderPostsGrid(posts);

    // Update active nav items
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active');
      if (item.dataset.view === 'profile' && user.username === window.CS_STATE.currentUser?.username) {
        item.classList.add('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Return back to feed
  showFeedView: () => {
    const feedContainer = document.getElementById('feedViewContainer');
    const profileContainer = document.getElementById('profileViewContainer');

    if (profileContainer) {
      profileContainer.style.display = 'none';
      profileContainer.classList.remove('active');
    }
    if (feedContainer) feedContainer.style.display = 'block';

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === 'feed');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Render profile header HTML
  renderProfileHeader: (user) => {
    const headerContainer = document.getElementById('profileHeaderContent');
    if (!headerContainer) return;

    const isSelf = window.CS_STATE.currentUser && window.CS_STATE.currentUser._id === user._id;

    headerContainer.innerHTML = `
      <div class="profile-main-info">
        <img src="${user.avatar || window.CS_UI.getDefaultAvatar(user.name)}" alt="${user.name}" class="profile-avatar-large">
        <div class="profile-user-meta">
          <div class="profile-top-row">
            <h2 class="profile-username-title">${user.username}</h2>
            ${
              isSelf
                ? `
              <button class="btn btn-secondary btn-sm" onclick="window.CS_PROFILE.openEditModal()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                Edit Profile
              </button>
            `
                : `
              <button class="btn-follow-toggle ${user.isFollowing ? 'following' : 'follow'}" id="profile-follow-btn" onclick="window.CS_PROFILE.toggleFollow('${user._id}')">
                ${user.isFollowing ? 'Following' : 'Follow'}
              </button>
            `
            }
          </div>

          <div class="profile-stats-row">
            <div class="profile-stat"><strong>${user.postsCount || 0}</strong> posts</div>
            <div class="profile-stat"><strong id="profileFollowersCount">${user.followersCount || 0}</strong> followers</div>
            <div class="profile-stat"><strong>${user.followingCount || 0}</strong> following</div>
          </div>

          <div>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary); margin-bottom: 2px;">${user.name}</div>
            ${user.bio ? `<div class="profile-bio-text">${window.CS_UI.formatTextWithTags(user.bio)}</div>` : ''}
          </div>

          <div class="profile-link-badges">
            ${
              user.website
                ? `
              <a href="${user.website.startsWith('http') ? user.website : 'https://' + user.website}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 4px; color: #3b82f6;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                ${user.website.replace(/^https?:\/\//, '')}
              </a>
            `
                : ''
            }
            ${user.location ? `<span>📍 ${user.location}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Profile Tabs -->
      <div class="profile-tabs-nav">
        <div class="profile-tab-item active" data-tab="posts" onclick="window.CS_PROFILE.switchTab('posts')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          Posts
        </div>
        ${
          isSelf
            ? `
          <div class="profile-tab-item" data-tab="saved" onclick="window.CS_PROFILE.switchTab('saved')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            Saved
          </div>
        `
            : ''
        }
      </div>
    `;
  },

  // Render 3-column photo grid
  renderPostsGrid: (posts) => {
    const container = document.getElementById('profilePostsGrid');
    if (!container) return;

    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">📷</div>
          <h4>No posts to display</h4>
        </div>
      `;
      return;
    }

    container.innerHTML = posts
      .map(
        (post) => `
      <div class="profile-grid-item" onclick="window.CS_PROFILE.viewPostInFeed('${post._id}')">
        <img src="${post.mediaUrl}" alt="Post thumbnail" class="filter-${post.filter || 'normal'}" loading="lazy">
        <div class="profile-grid-overlay">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span>${post.likes ? post.likes.length : 0}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            <span>${post.comments ? post.comments.length : 0}</span>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  },

  // Switch between Posts tab and Saved tab
  switchTab: async (tabName) => {
    document.querySelectorAll('.profile-tab-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });

    if (tabName === 'posts') {
      profileController.renderPostsGrid(profileController.profilePosts);
    } else if (tabName === 'saved') {
      try {
        const res = await window.CS_API.users.getSavedPosts();
        profileController.savedPosts = res.posts || [];
        profileController.renderPostsGrid(profileController.savedPosts);
      } catch (err) {
        window.CS_UI.showToast(err.message, 'error');
      }
    }
  },

  // Toggle follow on profile page
  toggleFollow: async (targetUserId) => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to follow creators', 'info');
      return;
    }

    try {
      const res = await window.CS_API.users.toggleFollow(targetUserId);
      const btn = document.getElementById('profile-follow-btn');
      const followersEl = document.getElementById('profileFollowersCount');

      if (btn) {
        if (res.isFollowing) {
          btn.className = 'btn-follow-toggle following';
          btn.innerText = 'Following';
        } else {
          btn.className = 'btn-follow-toggle follow';
          btn.innerText = 'Follow';
        }
      }

      if (followersEl) followersEl.innerText = res.followersCount;

      window.CS_UI.showToast(res.message, 'success');
      // Refresh suggestions
      window.CS_APP.loadSuggestions();
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // View post in feed
  viewPostInFeed: (postId) => {
    profileController.showFeedView();
    setTimeout(() => {
      const postEl = document.getElementById(`post-${postId}`);
      if (postEl) {
        postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postEl.style.boxShadow = '0 0 0 3px var(--primary)';
        setTimeout(() => (postEl.style.boxShadow = ''), 2000);
      }
    }, 100);
  },

  // Open Edit Profile Modal
  openEditModal: () => {
    const user = window.CS_STATE.currentUser;
    if (!user) return;

    document.getElementById('editNameInput').value = user.name || '';
    document.getElementById('editAvatarInput').value = user.avatar || '';
    document.getElementById('editBioInput').value = user.bio || '';
    document.getElementById('editWebsiteInput').value = user.website || '';
    document.getElementById('editLocationInput').value = user.location || '';

    window.CS_UI.openModal('editProfileModal');
  },

  // Setup Edit Profile Form
  setupEditProfileHandler: () => {
    const form = document.getElementById('editProfileForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');

      const name = document.getElementById('editNameInput').value.trim();
      const avatar = document.getElementById('editAvatarInput').value.trim();
      const bio = document.getElementById('editBioInput').value.trim();
      const website = document.getElementById('editWebsiteInput').value.trim();
      const location = document.getElementById('editLocationInput').value.trim();

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Saving...';
        }

        const res = await window.CS_API.auth.updateProfile({
          name,
          avatar,
          bio,
          website,
          location,
        });

        window.CS_STATE.setCurrentUser(res.user);
        window.CS_UI.closeModal('editProfileModal');
        window.CS_UI.showToast('Profile updated successfully! ✨', 'success');

        // Re-render profile
        profileController.loadProfile(res.user.username);
      } catch (err) {
        window.CS_UI.showToast(err.message, 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Save Changes';
        }
      }
    });
  },
};

window.CS_PROFILE = profileController;
