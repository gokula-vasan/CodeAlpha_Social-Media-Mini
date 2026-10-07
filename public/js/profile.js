// Profile Controller for ConnectSphere
const profileController = {
  currentProfileUsername: null,
  currentProfileUser: null,
  profilePosts: [],
  savedPosts: [],
  currentTab: 'posts',
  currentModalTab: 'followers',
  activeDetailPost: null,

  // Load and display profile page
  loadProfile: async (username) => {
    try {
      const cleanUsername = (username || '').replace(/^@/, '').trim();
      const res = await window.CS_API.users.getProfile(cleanUsername);
      profileController.currentProfileUsername = cleanUsername;
      profileController.currentProfileUser = res.user;
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
    profileController.switchTab('posts');

    // Update active nav items
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active');
      if (
        item.dataset.view === 'profile' &&
        user.username === window.CS_STATE.currentUser?.username
      ) {
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
    const postsCount = user.postsCount || (profileController.profilePosts ? profileController.profilePosts.length : 0);
    const followersCount = user.followersCount || (user.followers ? user.followers.length : 0);
    const followingCount = user.followingCount || (user.following ? user.following.length : 0);

    // Check if this profile user has active stories
    const userStoriesGroup = (window.CS_STATE.storiesGrouped || []).find((g) => {
      const uid = String(g.user?._id || g.user || '');
      const uname = String(g.user?.username || '').toLowerCase();
      const targetId = String(user._id || '');
      const targetName = String(user.username || '').toLowerCase();
      return (targetId && uid === targetId) || (targetName && uname === targetName);
    });
    const hasActiveStory = Boolean(userStoriesGroup && userStoriesGroup.stories && userStoriesGroup.stories.length > 0);

    headerContainer.innerHTML = `
      <div class="profile-main-info">
        <div class="profile-avatar-wrapper ${hasActiveStory ? 'has-active-story' : ''}">
          <img src="${user.avatar || window.CS_UI.getDefaultAvatar(user.name)}" 
               alt="${user.name}" 
               class="profile-avatar-large ${hasActiveStory ? 'has-story-ring' : ''}" 
               id="profileLargeAvatarImg"
               ${
                 hasActiveStory
                   ? `onclick="window.CS_STORIES.openViewerForUser('${user.username}')" style="cursor: pointer;" title="${isSelf ? 'View your story' : `View ${user.username}\'s story`}"`
                   : (isSelf ? `onclick="window.CS_PROFILE.triggerAvatarUpload(event)" style="cursor: pointer;" title="Click to upload profile photo"` : '')
               }>
          ${hasActiveStory ? `<span class="profile-story-badge" onclick="window.CS_STORIES.openViewerForUser('${user.username}')" title="Active story">Story</span>` : ''}
          ${
            isSelf
              ? `
            <button type="button" class="profile-avatar-camera-btn" onclick="window.CS_PROFILE.triggerAvatarUpload(event)" title="Change profile photo" aria-label="Change profile photo">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </button>
          `
              : ''
          }
        </div>
        ${isSelf ? `<input type="file" id="quickProfileAvatarInput" accept="image/*" style="display: none;" onchange="window.CS_PROFILE.uploadQuickAvatar(this.files[0])">` : ''}
        <div class="profile-user-meta">
          <div class="profile-top-row">
            <h2 class="profile-username-title">@${user.username}</h2>
            ${
              isSelf
                ? `
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${
                  hasActiveStory
                    ? `<button class="btn btn-primary btn-sm" onclick="window.CS_STORIES.openViewerForUser('${user.username}')" title="View your story (click to view or delete)">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                         View Story
                       </button>`
                    : `<button class="btn btn-secondary btn-sm" onclick="window.CS_STORIES.openCreateStoryModal()" title="Add to your story">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                         Add Story
                       </button>`
                }
                <button class="btn btn-secondary btn-sm" onclick="window.CS_PROFILE.openEditModal()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  Edit Profile
                </button>
              </div>
            `
                : `
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${
                  hasActiveStory
                    ? `<button class="btn btn-secondary btn-sm" onclick="window.CS_STORIES.openViewerForUser('${user.username}')" title="View ${user.username}'s story">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                         Watch Story
                       </button>`
                    : ''
                }
                <button class="btn-follow-toggle ${user.isFollowing ? 'following' : 'follow'}" id="profile-follow-btn" onclick="window.CS_PROFILE.toggleFollow('${user._id}')">
                  ${user.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            `
            }
          </div>

          <div class="profile-stats-row">
            <div class="profile-stat clickable" onclick="window.CS_PROFILE.switchTab('posts')" title="View ${user.username}'s posts">
              <strong id="profilePostsCount">${postsCount}</strong> posts
            </div>
            <div class="profile-stat clickable" onclick="window.CS_PROFILE.openFollowModal('followers')" title="View ${user.username}'s followers">
              <strong id="profileFollowersCount">${followersCount}</strong> followers
            </div>
            <div class="profile-stat clickable" onclick="window.CS_PROFILE.openFollowModal('following')" title="View accounts ${user.username} is following">
              <strong id="profileFollowingCount">${followingCount}</strong> following
            </div>
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
          <span class="tab-count-badge" id="tabPostsBadge">${postsCount}</span>
        </div>
        <div class="profile-tab-item" data-tab="followers" onclick="window.CS_PROFILE.switchTab('followers')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Followers
          <span class="tab-count-badge" id="tabFollowersBadge">${followersCount}</span>
        </div>
        <div class="profile-tab-item" data-tab="following" onclick="window.CS_PROFILE.switchTab('following')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
          Following
          <span class="tab-count-badge" id="tabFollowingBadge">${followingCount}</span>
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

  // Switch between Posts, Followers, Following, and Saved tabs
  switchTab: async (tabName) => {
    profileController.currentTab = tabName;

    // Update tab styles
    document.querySelectorAll('.profile-tab-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });

    const postsGrid = document.getElementById('profilePostsGrid');
    const followersContainer = document.getElementById('profileFollowersContainer');
    const followingContainer = document.getElementById('profileFollowingContainer');
    const savedGrid = document.getElementById('profileSavedGrid');

    if (postsGrid) postsGrid.style.display = 'none';
    if (followersContainer) followersContainer.style.display = 'none';
    if (followingContainer) followingContainer.style.display = 'none';
    if (savedGrid) savedGrid.style.display = 'none';

    if (tabName === 'posts') {
      if (postsGrid) postsGrid.style.display = 'grid';
      profileController.renderPostsGrid(profileController.profilePosts);
    } else if (tabName === 'followers') {
      if (followersContainer) followersContainer.style.display = 'flex';
      profileController.renderInlineFollowList('followers');
    } else if (tabName === 'following') {
      if (followingContainer) followingContainer.style.display = 'flex';
      profileController.renderInlineFollowList('following');
    } else if (tabName === 'saved') {
      if (savedGrid) savedGrid.style.display = 'grid';
      try {
        const res = await window.CS_API.users.getSavedPosts();
        profileController.savedPosts = res.posts || [];
        profileController.renderSavedPostsGrid(profileController.savedPosts);
      } catch (err) {
        window.CS_UI.showToast(err.message, 'error');
      }
    }
  },

  // Render 3-column photo grid for posts
  renderPostsGrid: (posts) => {
    const container = document.getElementById('profilePostsGrid');
    if (!container) return;

    const user = profileController.currentProfileUser || window.CS_STATE.currentProfileUser;
    const isSelf = window.CS_STATE.currentUser && user && window.CS_STATE.currentUser._id === user._id;

    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 16px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
          <div style="font-size: 2.8rem; margin-bottom: 10px;">📷</div>
          <h4 style="margin-bottom: 6px; font-size: 1.15rem;">No posts yet</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px;">
            ${isSelf ? 'Share your creative projects, photography, and thoughts with the community!' : `@${user?.username || 'user'} hasn't shared any posts yet.`}
          </p>
          ${
            isSelf
              ? `
            <button class="btn btn-primary" onclick="window.CS_POSTS.openCreateModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Create First Post
            </button>
          `
              : ''
          }
        </div>
      `;
      return;
    }

    container.innerHTML = posts
      .map(
        (post) => `
      <div class="profile-grid-item" onclick="window.CS_PROFILE.openPostDetail('${post._id}')" title="${window.CS_UI.escapeHtml(post.caption || 'View post')}">
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

  // Render Saved posts grid
  renderSavedPostsGrid: (posts) => {
    const container = document.getElementById('profileSavedGrid');
    if (!container) return;

    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 16px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
          <div style="font-size: 2.8rem; margin-bottom: 10px;">🔖</div>
          <h4 style="margin-bottom: 6px; font-size: 1.15rem;">No saved posts yet</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = posts
      .map(
        (post) => `
      <div class="profile-grid-item" onclick="window.CS_PROFILE.openPostDetail('${post._id}')">
        <img src="${post.mediaUrl}" alt="Saved post" class="filter-${post.filter || 'normal'}" loading="lazy">
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

  // Generate HTML for a list of follower or following user items
  buildFollowListHTML: (usersList, listType = 'followers') => {
    const currentUserId = window.CS_STATE.currentUser?._id;
    const currentUserFollowing = (window.CS_STATE.currentUser?.following || []).map((id) =>
      typeof id === 'object' ? id._id.toString() : id.toString()
    );

    if (!usersList || usersList.length === 0) {
      const isFollowers = listType === 'followers';
      return `
        <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
          <div style="font-size: 2.8rem; margin-bottom: 10px;">${isFollowers ? '👥' : '✨'}</div>
          <h4 style="color: var(--text-primary); margin-bottom: 6px; font-size: 1.1rem;">
            ${isFollowers ? 'No followers yet' : 'Not following anyone yet'}
          </h4>
          <p style="font-size: 0.88rem; max-width: 320px; margin: 0 auto;">
            ${
              isFollowers
                ? 'When other creators follow this account, they will be listed here.'
                : 'When this account follows creators, they will appear here.'
            }
          </p>
        </div>
      `;
    }

    return usersList
      .map((u) => {
        const userId = (u._id || '').toString();
        const isSelf = currentUserId && currentUserId.toString() === userId;
        const isFollowing = currentUserFollowing.includes(userId);
        const avatarSrc = u.avatar || window.CS_UI.getDefaultAvatar(u.name || u.username);

        return `
        <div class="follow-user-card" id="follow-card-${userId}">
          <div class="follow-user-info" onclick="window.CS_PROFILE.navigateToProfile('${u.username}')">
            <img src="${avatarSrc}" alt="${u.name || u.username}" class="avatar avatar-md">
            <div class="follow-user-names">
              <span class="follow-user-name">
                ${u.name || u.username}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9" fill="none" stroke="#fff" stroke-width="2.5"></polyline></svg>
              </span>
              <span class="follow-user-username">@${u.username}</span>
              ${u.bio ? `<span class="follow-user-bio">${window.CS_UI.escapeHtml(u.bio)}</span>` : ''}
            </div>
          </div>
          <div>
            ${
              isSelf
                ? `<span class="follow-self-badge">You</span>`
                : `
              <button 
                class="btn-follow-toggle ${isFollowing ? 'following' : 'follow'}" 
                id="follow-btn-${userId}" 
                onclick="window.CS_PROFILE.toggleFollowFromList('${userId}', this)">
                ${isFollowing ? 'Following' : 'Follow'}
              </button>
            `
            }
          </div>
        </div>
      `;
      })
      .join('');
  },

  // Render inline followers or following on profile page
  renderInlineFollowList: (type) => {
    const user = profileController.currentProfileUser;
    if (!user) return;

    const containerId =
      type === 'followers' ? 'profileFollowersContainer' : 'profileFollowingContainer';
    const container = document.getElementById(containerId);
    if (!container) return;

    const list = type === 'followers' ? user.followers || [] : user.following || [];
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color);">
        <h3 style="font-size: 1.1rem; font-weight: 800;">
          ${type === 'followers' ? 'Followers' : 'Following'} (${list.length})
        </h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">@${user.username}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${profileController.buildFollowListHTML(list, type)}
      </div>
    `;
  },

  // Open Followers & Following Modal
  openFollowModal: (initialTab = 'followers') => {
    const user = profileController.currentProfileUser;
    if (!user) return;

    const countFollowers = document.getElementById('followModalCountFollowers');
    const countFollowing = document.getElementById('followModalCountFollowing');
    const searchInput = document.getElementById('followListSearchInput');

    if (countFollowers) countFollowers.innerText = (user.followers || []).length;
    if (countFollowing) countFollowing.innerText = (user.following || []).length;
    if (searchInput) searchInput.value = '';

    window.CS_UI.openModal('followListModal');
    profileController.switchFollowModalTab(initialTab);
  },

  // Switch between followers and following tabs inside modal
  switchFollowModalTab: (tabType) => {
    profileController.currentModalTab = tabType;

    const tabFollowers = document.getElementById('followModalTabFollowers');
    const tabFollowing = document.getElementById('followModalTabFollowing');
    const listContainer = document.getElementById('followModalListContainer');
    const searchInput = document.getElementById('followListSearchInput');

    if (tabFollowers) tabFollowers.classList.toggle('active', tabType === 'followers');
    if (tabFollowing) tabFollowing.classList.toggle('active', tabType === 'following');

    if (searchInput) {
      searchInput.placeholder =
        tabType === 'followers' ? 'Search followers...' : 'Search following...';
      searchInput.value = '';
    }

    if (!listContainer) return;

    const user = profileController.currentProfileUser;
    const list = tabType === 'followers' ? user?.followers || [] : user?.following || [];

    listContainer.innerHTML = profileController.buildFollowListHTML(list, tabType);
  },

  // Live filter people in modal
  filterFollowList: (query) => {
    const user = profileController.currentProfileUser;
    if (!user) return;

    const tabType = profileController.currentModalTab || 'followers';
    const originalList = tabType === 'followers' ? user.followers || [] : user.following || [];
    const listContainer = document.getElementById('followModalListContainer');
    if (!listContainer) return;

    const clean = (query || '').trim().toLowerCase();
    if (!clean) {
      listContainer.innerHTML = profileController.buildFollowListHTML(originalList, tabType);
      return;
    }

    const filtered = originalList.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const uname = (u.username || '').toLowerCase();
      return name.includes(clean) || uname.includes(clean);
    });

    listContainer.innerHTML = profileController.buildFollowListHTML(filtered, tabType);
  },

  // Toggle follow directly from followers or following list
  toggleFollowFromList: async (targetUserId, btnEl) => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to follow creators', 'info');
      return;
    }

    try {
      const res = await window.CS_API.users.toggleFollow(targetUserId);

      // Update button appearance
      if (btnEl) {
        if (res.isFollowing) {
          btnEl.className = 'btn-follow-toggle following';
          btnEl.innerText = 'Following';
        } else {
          btnEl.className = 'btn-follow-toggle follow';
          btnEl.innerText = 'Follow';
        }
      }

      // Update current user's local state
      if (window.CS_STATE.currentUser) {
        let following = window.CS_STATE.currentUser.following || [];
        if (res.isFollowing) {
          if (!following.some((id) => (id._id || id).toString() === targetUserId.toString())) {
            following.push(targetUserId);
          }
        } else {
          following = following.filter(
            (id) => (id._id || id).toString() !== targetUserId.toString()
          );
        }
        window.CS_STATE.currentUser.following = following;
      }

      // If the target user is currently loaded profile, update header follow button and follower count
      if (
        profileController.currentProfileUser &&
        profileController.currentProfileUser._id === targetUserId
      ) {
        const headerBtn = document.getElementById('profile-follow-btn');
        const followersCountEl = document.getElementById('profileFollowersCount');
        const tabFollowersBadge = document.getElementById('tabFollowersBadge');

        if (headerBtn) {
          headerBtn.className = `btn-follow-toggle ${res.isFollowing ? 'following' : 'follow'}`;
          headerBtn.innerText = res.isFollowing ? 'Following' : 'Follow';
        }
        if (followersCountEl) followersCountEl.innerText = res.followersCount;
        if (tabFollowersBadge) tabFollowersBadge.innerText = res.followersCount;
      }

      window.CS_UI.showToast(res.message, 'success');
      window.CS_APP.loadSuggestions();
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Navigate to another user's profile from list
  navigateToProfile: (username) => {
    window.CS_UI.closeModal('followListModal');
    window.CS_UI.closeModal('postDetailModal');
    window.CS_APP.openProfile(username);
  },

  // Open Post Detail Modal with full image, comments, and like toggle
  openPostDetail: async (postId) => {
    try {
      let post = profileController.profilePosts.find((p) => p._id === postId);
      if (!post) {
        const res = await window.CS_API.posts.getById(postId);
        post = res.post;
      }
      if (!post) return;

      profileController.activeDetailPost = post;
      const modalContent = document.getElementById('postDetailModalContent');
      if (!modalContent) return;

      const currentUserId = window.CS_STATE.currentUser?._id;
      const isOwner = currentUserId && (post.user?._id || post.user) === currentUserId;
      const authorName = post.user?.name || 'ConnectSphere User';
      const authorUsername = post.user?.username || 'user';
      const authorAvatar = post.user?.avatar || window.CS_UI.getDefaultAvatar(authorName);
      const isLiked = !!post.isLiked;
      const likeCount = post.likes ? post.likes.length : 0;
      const comments = post.comments || [];
      const timeAgo = window.CS_UI.formatTimeAgo(post.createdAt);

      modalContent.innerHTML = `
        <!-- Left: Image Preview -->
        <div class="post-detail-media-col">
          <img src="${post.mediaUrl}" alt="Post photo" class="post-detail-img filter-${post.filter || 'normal'}">
        </div>

        <!-- Right: Meta, Comments, and Actions -->
        <div class="post-detail-info-col">
          <!-- Header -->
          <div class="post-detail-header">
            <div class="post-detail-author" onclick="window.CS_PROFILE.navigateToProfile('${authorUsername}')">
              <img src="${authorAvatar}" alt="${authorName}" class="avatar avatar-sm">
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 4px;">
                  ${authorName}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9" fill="none" stroke="#fff" stroke-width="2.5"></polyline></svg>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">@${authorUsername} • ${timeAgo}</div>
              </div>
            </div>
            ${
              isOwner
                ? `
              <button class="btn btn-secondary btn-sm danger" onclick="window.CS_PROFILE.deletePostFromDetail('${post._id}')" title="Delete post">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            `
                : ''
            }
          </div>

          <!-- Body: Caption & Comments -->
          <div class="post-detail-body">
            <!-- Caption -->
            ${
              post.caption
                ? `
              <div class="post-detail-caption-box">
                <img src="${authorAvatar}" alt="${authorName}" class="avatar avatar-xs" style="margin-top: 2px;">
                <div>
                  <strong style="color: var(--text-primary); cursor: pointer;" onclick="window.CS_PROFILE.navigateToProfile('${authorUsername}')">
                    ${authorUsername}
                  </strong>
                  <span style="margin-left: 6px;">${window.CS_UI.formatTextWithTags(post.caption)}</span>
                  ${post.location ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">📍 ${post.location}</div>` : ''}
                </div>
              </div>
            `
                : ''
            }

            <!-- Comments List -->
            <div class="post-detail-comments-list" id="postDetailCommentsContainer">
              ${
                comments.length === 0
                  ? `<p style="color: var(--text-muted); font-size: 0.88rem; text-align: center; padding: 20px 0;">No comments yet. Start the conversation!</p>`
                  : comments
                      .map((c) => {
                        const postOwnerId = (post.user?._id || post.user || '').toString();
                        const commentUserId = (c.user?._id || c.user || '').toString();
                        const isPostAuthor = commentUserId && postOwnerId && commentUserId === postOwnerId;
                        const commenterUsername = c.user?.username || 'user';
                        const commenterAvatar =
                          c.user?.avatar || window.CS_UI.getDefaultAvatar(c.user?.name || commenterUsername);
                        const canDelete =
                          currentUserId &&
                          (currentUserId === commentUserId || currentUserId === postOwnerId);

                        return `
                        <div class="comment-item ${isPostAuthor ? 'author-comment' : ''}" id="detail-comment-${c._id}" style="display: flex; gap: 10px; align-items: flex-start;">
                          <img src="${commenterAvatar}" alt="${commenterUsername}" class="avatar avatar-xs" style="margin-top: 2px;">
                          <div style="flex: 1; font-size: 0.88rem;">
                            <strong style="color: var(--text-primary); cursor: pointer;" onclick="window.CS_PROFILE.navigateToProfile('${commenterUsername}')">
                              ${commenterUsername}
                            </strong>
                            ${isPostAuthor ? `<span class="comment-badge-author">Author</span>` : ''}
                            ${c.replyToUsername ? `<span class="comment-replying-tag">↪ @${c.replyToUsername}</span>` : ''}
                            <span style="margin-left: 6px; color: var(--text-primary);">${window.CS_UI.formatTextWithTags(c.text)}</span>
                            <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                              <span style="font-size: 0.75rem; color: var(--text-muted);">${window.CS_UI.formatTimeAgo(c.createdAt)}</span>
                              <button type="button" class="comment-reply-btn" onclick="window.CS_PROFILE.startReplyInDetail('${post._id}', '${c._id}', '${commenterUsername}')">Reply</button>
                            </div>
                          </div>
                          ${
                            canDelete
                              ? `<button class="comment-delete-btn" onclick="window.CS_PROFILE.deleteCommentInDetail('${post._id}', '${c._id}')" title="Delete comment">✕</button>`
                              : ''
                          }
                        </div>
                      `;
                      })
                      .join('')
              }
            </div>
          </div>

          <!-- Footer: Actions & Add Comment -->
          <div class="post-detail-footer">
            <div class="post-detail-actions">
              <div style="display: flex; align-items: center; gap: 12px;">
                <button 
                  class="action-btn ${isLiked ? 'liked' : ''}" 
                  id="detailLikeBtn-${post._id}" 
                  onclick="window.CS_PROFILE.toggleLikeInDetail('${post._id}')"
                  title="Like post">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="${isLiked ? '#ef4444' : 'none'}" stroke="${isLiked ? '#ef4444' : 'currentColor'}" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
                <span id="detailLikeCount-${post._id}" style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
                  ${likeCount} ${likeCount === 1 ? 'like' : 'likes'}
                </span>
              </div>

              <button class="btn btn-secondary btn-sm" onclick="window.CS_PROFILE.viewPostInFeed('${post._id}')" title="Scroll to post in home feed">
                View in Feed
              </button>
            </div>

            <!-- Reply Banner in Detail Modal -->
            <div class="comment-reply-banner" id="detail-reply-banner-${post._id}" style="display: none; border-radius: var(--radius-sm); margin-bottom: 8px;">
              <span>Replying to <strong id="detail-reply-user-${post._id}">@user</strong></span>
              <button type="button" class="btn-cancel-reply" onclick="window.CS_PROFILE.cancelReplyInDetail('${post._id}')" title="Cancel reply">✕</button>
            </div>

            ${
              isOwner
                ? `
              <!-- Post Author Mode: Only Reply Allowed -->
              <div class="post-owner-comment-container" id="detail-owner-container-${post._id}">
                <div class="post-owner-hint-box" id="detail-owner-hint-${post._id}" style="border: none; padding: 6px 0;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <span>${comments.length > 0 ? 'Post author: click <strong>Reply</strong> on any comment to respond' : 'No comments yet. Viewers can comment on your post!'}</span>
                </div>
                <form id="detail-comment-form-${post._id}" onsubmit="window.CS_PROFILE.addCommentInDetail(event, '${post._id}')" class="post-detail-add-comment" style="display: none;">
                  <input type="hidden" id="detail-reply-to-id-${post._id}" value="">
                  <input 
                    type="text" 
                    id="detailCommentInput-${post._id}" 
                    placeholder="Reply to comment as author..." 
                    style="flex: 1; padding: 10px 14px; border-radius: var(--radius-full); border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); outline: none; font-size: 0.9rem;"
                    autocomplete="off"
                    required>
                  <button type="submit" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full); padding: 8px 16px;">
                    Reply
                  </button>
                </form>
              </div>
            `
                : `
              <!-- Other Users: Standard Comment Form -->
              <form id="detail-comment-form-${post._id}" onsubmit="window.CS_PROFILE.addCommentInDetail(event, '${post._id}')" class="post-detail-add-comment">
                <input type="hidden" id="detail-reply-to-id-${post._id}" value="">
                <input 
                  type="text" 
                  id="detailCommentInput-${post._id}" 
                  placeholder="Add a comment as @${window.CS_STATE.currentUser?.username || 'user'}..." 
                  style="flex: 1; padding: 10px 14px; border-radius: var(--radius-full); border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); outline: none; font-size: 0.9rem;"
                  autocomplete="off"
                  required>
                <button type="submit" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full); padding: 8px 16px;">
                  Post
                </button>
              </form>
            `
            }
          </div>
        </div>
      `;

      window.CS_UI.openModal('postDetailModal');
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Start reply mode in Post Detail modal
  startReplyInDetail: (postId, commentId, username) => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to reply', 'info');
      return;
    }

    const replyIdInput = document.getElementById(`detail-reply-to-id-${postId}`);
    const replyBanner = document.getElementById(`detail-reply-banner-${postId}`);
    const replyUserSpan = document.getElementById(`detail-reply-user-${postId}`);
    const form = document.getElementById(`detail-comment-form-${postId}`);
    const ownerHint = document.getElementById(`detail-owner-hint-${postId}`);
    const input = document.getElementById(`detailCommentInput-${postId}`);

    if (replyIdInput) replyIdInput.value = commentId;
    if (replyUserSpan) replyUserSpan.innerText = `@${username}`;
    if (replyBanner) replyBanner.style.display = 'flex';
    if (form) form.style.display = 'flex';
    if (ownerHint) ownerHint.style.display = 'none';

    if (input) {
      input.placeholder = `Reply to @${username}...`;
      input.value = `@${username} `;
      input.focus();
    }
  },

  // Cancel reply mode in Post Detail modal
  cancelReplyInDetail: (postId) => {
    const replyIdInput = document.getElementById(`detail-reply-to-id-${postId}`);
    const replyBanner = document.getElementById(`detail-reply-banner-${postId}`);
    const form = document.getElementById(`detail-comment-form-${postId}`);
    const ownerHint = document.getElementById(`detail-owner-hint-${postId}`);
    const input = document.getElementById(`detailCommentInput-${postId}`);

    if (replyIdInput) replyIdInput.value = '';
    if (replyBanner) replyBanner.style.display = 'none';

    if (ownerHint) {
      ownerHint.style.display = 'flex';
      if (form) form.style.display = 'none';
    }

    if (input) {
      input.value = '';
      input.placeholder = `Add a comment as @${window.CS_STATE.currentUser?.username || 'user'}...`;
    }
  },

  // Toggle like in post detail modal
  toggleLikeInDetail: async (postId) => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to like posts', 'info');
      return;
    }

    try {
      const res = await window.CS_API.posts.toggleLike(postId);
      const btn = document.getElementById(`detailLikeBtn-${postId}`);
      const countEl = document.getElementById(`detailLikeCount-${postId}`);

      if (btn) {
        btn.classList.toggle('liked', res.isLiked);
        const svg = btn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', res.isLiked ? '#ef4444' : 'none');
          svg.setAttribute('stroke', res.isLiked ? '#ef4444' : 'currentColor');
        }
      }
      if (countEl) {
        countEl.innerText = `${res.likeCount} ${res.likeCount === 1 ? 'like' : 'likes'}`;
      }

      // Also update in profilePosts array
      const post = profileController.profilePosts.find((p) => p._id === postId);
      if (post) {
        post.isLiked = res.isLiked;
        post.likes = new Array(res.likeCount).fill(1);
      }
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Add comment in post detail modal
  addCommentInDetail: async (e, postId) => {
    e.preventDefault();
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to comment', 'info');
      return;
    }

    const input = document.getElementById(`detailCommentInput-${postId}`);
    const replyIdInput = document.getElementById(`detail-reply-to-id-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const replyTo = replyIdInput && replyIdInput.value ? replyIdInput.value : null;

    try {
      const res = await window.CS_API.posts.addComment(postId, text, replyTo);
      input.value = '';
      profileController.cancelReplyInDetail(postId);

      const container = document.getElementById('postDetailCommentsContainer');
      if (container) {
        // If empty state was shown, clear it
        if (container.querySelector('p')) {
          container.innerHTML = '';
        }

        const c = res.comment;
        const post = profileController.profilePosts.find((p) => p._id === postId) || {};
        const postOwnerId = (post.user?._id || post.user || window.CS_STATE.currentProfileUser?._id || '').toString();
        const commentUserId = (c.user?._id || c.user || window.CS_STATE.currentUser?._id || '').toString();
        const isPostAuthor = commentUserId && postOwnerId && commentUserId === postOwnerId;

        const commenterUsername = c.user?.username || window.CS_STATE.currentUser?.username || 'user';
        const commenterAvatar =
          c.user?.avatar ||
          window.CS_STATE.currentUser?.avatar ||
          window.CS_UI.getDefaultAvatar(commenterUsername);

        const newCommentHTML = `
          <div class="comment-item fade-in ${isPostAuthor ? 'author-comment' : ''}" id="detail-comment-${c._id}" style="display: flex; gap: 10px; align-items: flex-start;">
            <img src="${commenterAvatar}" alt="${commenterUsername}" class="avatar avatar-xs" style="margin-top: 2px;">
            <div style="flex: 1; font-size: 0.88rem;">
              <strong style="color: var(--text-primary); cursor: pointer;" onclick="window.CS_PROFILE.navigateToProfile('${commenterUsername}')">
                ${commenterUsername}
              </strong>
              ${isPostAuthor ? `<span class="comment-badge-author">Author</span>` : ''}
              ${c.replyToUsername ? `<span class="comment-replying-tag">↪ @${c.replyToUsername}</span>` : ''}
              <span style="margin-left: 6px; color: var(--text-primary);">${window.CS_UI.formatTextWithTags(c.text)}</span>
              <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-muted);">Just now</span>
                <button type="button" class="comment-reply-btn" onclick="window.CS_PROFILE.startReplyInDetail('${postId}', '${c._id}', '${commenterUsername}')">Reply</button>
              </div>
            </div>
            <button class="comment-delete-btn" onclick="window.CS_PROFILE.deleteCommentInDetail('${postId}', '${c._id}')" title="Delete comment">✕</button>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', newCommentHTML);
      }

      window.CS_UI.showToast(res.message || 'Comment posted! 💬', 'success');
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Delete comment in post detail modal
  deleteCommentInDetail: async (postId, commentId) => {
    try {
      await window.CS_API.posts.deleteComment(postId, commentId);
      const item = document.getElementById(`detail-comment-${commentId}`);
      if (item) item.remove();
      window.CS_UI.showToast('Comment deleted', 'info');
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Delete post from modal
  deletePostFromDetail: async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await window.CS_API.posts.delete(postId);
      window.CS_UI.closeModal('postDetailModal');
      window.CS_UI.showToast('Post deleted successfully', 'success');

      // Reload profile
      if (profileController.currentProfileUsername) {
        profileController.loadProfile(profileController.currentProfileUsername);
      }
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Toggle follow on profile page header
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
      const tabFollowersBadge = document.getElementById('tabFollowersBadge');

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
      if (tabFollowersBadge) tabFollowersBadge.innerText = res.followersCount;

      // Update current user following list
      if (window.CS_STATE.currentUser) {
        let following = window.CS_STATE.currentUser.following || [];
        if (res.isFollowing) {
          if (!following.some((id) => (id._id || id).toString() === targetUserId.toString())) {
            following.push(targetUserId);
          }
        } else {
          following = following.filter(
            (id) => (id._id || id).toString() !== targetUserId.toString()
          );
        }
        window.CS_STATE.currentUser.following = following;
      }

      window.CS_UI.showToast(res.message, 'success');
      window.CS_APP.loadSuggestions();
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // View post in feed
  viewPostInFeed: async (postId) => {
    window.CS_UI.closeModal('postDetailModal');
    profileController.showFeedView();
    window.CS_APP.switchFeedTab('foryou');

    let postEl = document.getElementById(`post-${postId}`);
    if (!postEl) {
      await window.CS_APP.loadFeed();
      postEl = document.getElementById(`post-${postId}`);
    }

    setTimeout(() => {
      if (postEl) {
        postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postEl.style.boxShadow = '0 0 0 3px var(--primary)';
        setTimeout(() => (postEl.style.boxShadow = ''), 2000);
      }
    }, 150);
  },

  editProfileRemoveAvatar: false,

  // Trigger file picker for avatar upload without triggering story viewer
  triggerAvatarUpload: (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    const input = document.getElementById('quickProfileAvatarInput');
    if (input) {
      input.value = '';
      input.click();
    }
  },

  // Quick avatar upload directly from clicking profile photo / camera icon
  uploadQuickAvatar: async (file) => {
    if (!file) return;
    try {
      window.CS_UI.showToast('Uploading profile photo...', 'info');
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await window.CS_API.auth.updateProfile(formData);
      window.CS_STATE.setCurrentUser(res.user);
      if (window.CS_AUTH && window.CS_AUTH.updateAuthUI) {
        window.CS_AUTH.updateAuthUI(res.user);
      }

      window.CS_UI.showToast('Profile photo updated successfully! 📸', 'success');

      // Re-render profile view and stories bar
      profileController.renderProfileHeader(res.user);
      if (window.CS_STORIES && window.CS_STATE.storiesGrouped) {
        window.CS_STORIES.renderStoriesBar(window.CS_STATE.storiesGrouped);
      }
    } catch (err) {
      window.CS_UI.showToast(err.message || 'Failed to upload photo', 'error');
    }
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

    // Initialize photo preview
    const previewImg = document.getElementById('editAvatarPreviewImg');
    if (previewImg) {
      previewImg.src = user.avatar || window.CS_UI.getDefaultAvatar(user.name);
    }
    const fileInput = document.getElementById('editAvatarFileInput');
    if (fileInput) fileInput.value = '';

    profileController.editProfileRemoveAvatar = false;

    window.CS_UI.openModal('editProfileModal');
  },

  // Setup Edit Profile Form
  setupEditProfileHandler: () => {
    const form = document.getElementById('editProfileForm');
    const fileInput = document.getElementById('editAvatarFileInput');
    const urlInput = document.getElementById('editAvatarInput');
    const previewImg = document.getElementById('editAvatarPreviewImg');
    const removeBtn = document.getElementById('btnRemoveAvatar');
    if (!form) return;

    // File input change: live preview
    if (fileInput && previewImg) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          profileController.editProfileRemoveAvatar = false;
          const reader = new FileReader();
          reader.onload = (evt) => {
            previewImg.src = evt.target.result;
          };
          reader.readAsDataURL(e.target.files[0]);
          if (urlInput) urlInput.value = '';
        }
      });
    }

    // URL input typing: live preview
    if (urlInput && previewImg) {
      urlInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
          profileController.editProfileRemoveAvatar = false;
          previewImg.src = val;
        } else if (!val && (!fileInput || !fileInput.files[0])) {
          const user = window.CS_STATE.currentUser;
          previewImg.src = user ? (user.avatar || window.CS_UI.getDefaultAvatar(user.name)) : '';
        }
      });
    }

    // Remove photo button
    if (removeBtn && previewImg) {
      removeBtn.addEventListener('click', () => {
        profileController.editProfileRemoveAvatar = true;
        if (fileInput) fileInput.value = '';
        if (urlInput) urlInput.value = '';
        const user = window.CS_STATE.currentUser;
        previewImg.src = window.CS_UI.getDefaultAvatar(user?.name || 'User');
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');

      const name = document.getElementById('editNameInput').value.trim();
      const avatarUrl = urlInput ? urlInput.value.trim() : '';
      const bio = document.getElementById('editBioInput').value.trim();
      const website = document.getElementById('editWebsiteInput').value.trim();
      const location = document.getElementById('editLocationInput').value.trim();
      const file = fileInput && fileInput.files && fileInput.files[0];

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Saving...';
        }

        let res;
        if (file) {
          // File upload via multipart/form-data
          const formData = new FormData();
          formData.append('avatar', file);
          formData.append('name', name);
          formData.append('bio', bio);
          formData.append('website', website);
          formData.append('location', location);
          res = await window.CS_API.auth.updateProfile(formData);
        } else {
          // URL or Remove Avatar via JSON
          res = await window.CS_API.auth.updateProfile({
            name,
            bio,
            website,
            location,
            avatar: profileController.editProfileRemoveAvatar ? '' : avatarUrl,
            removeAvatar: profileController.editProfileRemoveAvatar,
          });
        }

        window.CS_STATE.setCurrentUser(res.user);
        if (window.CS_AUTH && window.CS_AUTH.updateAuthUI) {
          window.CS_AUTH.updateAuthUI(res.user);
        }

        window.CS_UI.closeModal('editProfileModal');
        window.CS_UI.showToast('Profile updated successfully! ✨', 'success');

        // Re-render profile
        profileController.loadProfile(res.user.username);
        if (window.CS_STORIES && window.CS_STATE.storiesGrouped) {
          window.CS_STORIES.renderStoriesBar(window.CS_STATE.storiesGrouped);
        }
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
