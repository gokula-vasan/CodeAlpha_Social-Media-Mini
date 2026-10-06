// Stories Controller for ConnectSphere
const storiesController = {
  activeTimer: null,
  activeProgressInterval: null,
  currentSegmentIndex: 0,
  currentUserGroupIndex: 0,

  // Render horizontal story bar
  renderStoriesBar: (userStoriesList) => {
    const container = document.getElementById('storiesContainer');
    if (!container) return;

    const currentUser = window.CS_STATE.currentUser;
    const hasStories = userStoriesList && userStoriesList.length > 0;

    if (!currentUser && !hasStories) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    let html = '';

    // Check if the currently logged-in user has active stories
    let myGroupIndex = -1;
    if (currentUser && hasStories) {
      const myId = (currentUser._id || '').toString();
      const myUsername = (currentUser.username || '').toLowerCase();
      myGroupIndex = userStoriesList.findIndex((g) => {
        const uid = (g.user?._id || g.user || '').toString();
        const uname = (g.user?.username || '').toLowerCase();
        return (myId && uid === myId) || (myUsername && uname === myUsername);
      });
    }

    const myStoryGroup = myGroupIndex !== -1 ? userStoriesList[myGroupIndex] : null;

    if (currentUser) {
      if (myStoryGroup && myStoryGroup.stories && myStoryGroup.stories.length > 0) {
        // Current user has active stories:
        // Clicking "Your Story" opens the viewer so they can view and delete their stories
        // Clicking the '+' badge opens the create story modal to add another story
        html += `
          <!-- Your Story (Active) -->
          <div class="story-item" onclick="window.CS_STORIES.openViewer(${myGroupIndex}, 0)" title="View your story (click to view or delete)">
            <div class="story-avatar-wrapper has-my-story">
              <img src="${currentUser.avatar || window.CS_UI.getDefaultAvatar(currentUser.name)}" alt="Your Story" class="avatar">
              <div class="story-add-badge" onclick="event.stopPropagation(); window.CS_STORIES.openCreateStoryModal()" title="Add another story">+</div>
            </div>
            <span class="story-username">Your Story</span>
          </div>
        `;
      } else {
        // Current user has no active stories:
        // Clicking opens Create Story modal
        html += `
          <!-- Add Story Item -->
          <div class="story-item" onclick="window.CS_STORIES.openCreateStoryModal()" title="Add to your story">
            <div class="story-add-wrapper">
              <img src="${currentUser.avatar || window.CS_UI.getDefaultAvatar(currentUser.name)}" alt="You" class="avatar avatar-sm">
              <div class="story-add-badge">+</div>
            </div>
            <span class="story-username">Your Story</span>
          </div>
        `;
      }
    }

    // Render other users' stories (filter out current user to avoid duplicate bubble)
    if (hasStories) {
      userStoriesList.forEach((group, groupIdx) => {
        if (groupIdx === myGroupIndex) return; // Already represented in "Your Story"
        const user = group.user;
        if (!user) return;
        html += `
          <div class="story-item" onclick="window.CS_STORIES.openViewer(${groupIdx}, 0)" title="View ${user.username}'s story">
            <div class="story-avatar-wrapper">
              <img src="${user.avatar || window.CS_UI.getDefaultAvatar(user.name)}" alt="${user.name}" class="avatar">
            </div>
            <span class="story-username">${user.username}</span>
          </div>
        `;
      });
    }

    container.innerHTML = html;
  },

  // Open Fullscreen Story Viewer
  openViewer: (groupIndex, storyIndex = 0) => {
    const groups = window.CS_STATE.storiesGrouped;
    if (!groups || !groups[groupIndex]) return;

    storiesController.currentUserGroupIndex = groupIndex;
    storiesController.currentSegmentIndex = storyIndex;

    const modal = document.getElementById('storyViewerModal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      storiesController.showCurrentStory();
    }
  },

  // Close Story Viewer
  closeViewer: () => {
    storiesController.clearTimers();
    const modal = document.getElementById('storyViewerModal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Show active story in viewer
  showCurrentStory: () => {
    storiesController.clearTimers();

    const groups = window.CS_STATE.storiesGrouped;
    const group = groups[storiesController.currentUserGroupIndex];
    if (!group || !group.stories || !group.stories[storiesController.currentSegmentIndex]) {
      storiesController.closeViewer();
      return;
    }

    const story = group.stories[storiesController.currentSegmentIndex];
    const user = group.user;

    // Elements
    const mediaImg = document.getElementById('storyViewerMedia');
    const authorAvatar = document.getElementById('storyViewerAuthorAvatar');
    const authorName = document.getElementById('storyViewerAuthorName');
    const captionEl = document.getElementById('storyViewerCaption');
    const progressContainer = document.getElementById('storyProgressContainer');
    const timeBadge = document.getElementById('storyViewerTimeBadge');
    const deleteBtn = document.getElementById('storyViewerDeleteBtn');

    // Set media image
    if (mediaImg) {
      mediaImg.src = story.mediaUrl;
    }

    if (authorAvatar) {
      authorAvatar.src = user.avatar || window.CS_UI.getDefaultAvatar(user.name);
      authorAvatar.style.cursor = 'pointer';
      authorAvatar.onclick = () => {
        storiesController.closeViewer();
        window.CS_APP.openProfile(user.username);
      };
    }
    if (authorName) {
      authorName.innerText = user.username;
      authorName.style.cursor = 'pointer';
      authorName.onclick = () => {
        storiesController.closeViewer();
        window.CS_APP.openProfile(user.username);
      };
    }

    // Time remaining badge (stories auto-delete after 24 hours)
    let remainingText = story.timeRemainingFormatted;
    if (!remainingText && story.expiresAt) {
      const msLeft = Math.max(0, new Date(story.expiresAt).getTime() - Date.now());
      const hoursLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60)));
      remainingText = `${hoursLeft}h left`;
    }
    if (timeBadge) {
      timeBadge.innerText = `⏳ ${remainingText || '24h'}`;
      timeBadge.title = `This story will automatically be deleted after 24 hours (${remainingText || '24h left'})`;
    }

    // Story delete button: ONLY shown to the person who posted it
    const currentUserId = (window.CS_STATE.currentUser?._id || '').toString();
    const currentUsername = (window.CS_STATE.currentUser?.username || '').toLowerCase();
    const storyUserId = (story.user?._id || story.user || '').toString();
    const groupUserId = (user?._id || user || '').toString();
    const storyUsername = (story.user?.username || user?.username || '').toLowerCase();

    const isOwner =
      Boolean(currentUserId && (currentUserId === storyUserId || currentUserId === groupUserId)) ||
      Boolean(currentUsername && currentUsername === storyUsername);

    if (deleteBtn) {
      deleteBtn.style.display = isOwner ? 'flex' : 'none';
      if (isOwner) {
        deleteBtn.title = 'Delete your story';
      }
    }

    if (captionEl) {
      if (story.caption) {
        captionEl.innerText = story.caption;
        captionEl.style.display = 'block';
      } else {
        captionEl.style.display = 'none';
      }
    }

    // Build segments
    if (progressContainer) {
      progressContainer.innerHTML = group.stories
        .map(
          (_, idx) => `
        <div class="story-progress-segment">
          <div class="story-progress-fill" id="story-fill-${idx}" style="width: ${
            idx < storiesController.currentSegmentIndex ? '100%' : '0%'
          }"></div>
        </div>
      `
        )
        .join('');
    }

    // Animate current segment fill over 4.5 seconds
    const duration = 4500;
    const step = 50;
    let elapsed = 0;
    const activeFill = document.getElementById(`story-fill-${storiesController.currentSegmentIndex}`);

    storiesController.activeProgressInterval = setInterval(() => {
      elapsed += step;
      const pct = Math.min((elapsed / duration) * 100, 100);
      if (activeFill) activeFill.style.width = `${pct}%`;

      if (elapsed >= duration) {
        storiesController.nextStory();
      }
    }, step);
  },

  nextStory: () => {
    const groups = window.CS_STATE.storiesGrouped;
    const group = groups[storiesController.currentUserGroupIndex];

    if (storiesController.currentSegmentIndex < group.stories.length - 1) {
      storiesController.currentSegmentIndex++;
      storiesController.showCurrentStory();
    } else if (storiesController.currentUserGroupIndex < groups.length - 1) {
      storiesController.currentUserGroupIndex++;
      storiesController.currentSegmentIndex = 0;
      storiesController.showCurrentStory();
    } else {
      storiesController.closeViewer();
    }
  },

  prevStory: () => {
    if (storiesController.currentSegmentIndex > 0) {
      storiesController.currentSegmentIndex--;
      storiesController.showCurrentStory();
    } else if (storiesController.currentUserGroupIndex > 0) {
      storiesController.currentUserGroupIndex--;
      const prevGroup = window.CS_STATE.storiesGrouped[storiesController.currentUserGroupIndex];
      storiesController.currentSegmentIndex = prevGroup.stories.length - 1;
      storiesController.showCurrentStory();
    }
  },

  clearTimers: () => {
    if (storiesController.activeProgressInterval) {
      clearInterval(storiesController.activeProgressInterval);
      storiesController.activeProgressInterval = null;
    }
  },

  // Delete current active story manually (strictly for the story owner)
  deleteCurrentStory: async () => {
    storiesController.clearTimers();
    const groups = window.CS_STATE.storiesGrouped;
    const group = groups[storiesController.currentUserGroupIndex];
    if (!group || !group.stories || !group.stories[storiesController.currentSegmentIndex]) return;

    const story = group.stories[storiesController.currentSegmentIndex];
    const storyUser = group.user;

    // Strict frontend verification: only the owner can trigger delete
    const currentUserId = (window.CS_STATE.currentUser?._id || '').toString();
    const currentUsername = (window.CS_STATE.currentUser?.username || '').toLowerCase();
    const storyUserId = (story.user?._id || story.user || storyUser?._id || '').toString();
    const storyUsername = (story.user?.username || storyUser?.username || '').toLowerCase();

    const isOwner =
      Boolean(currentUserId && (currentUserId === storyUserId || currentUserId === (storyUser?._id || '').toString())) ||
      Boolean(currentUsername && (currentUsername === storyUsername || currentUsername === (storyUser?.username || '').toLowerCase()));

    if (!isOwner) {
      window.CS_UI.showToast('You can only delete your own stories', 'error');
      storiesController.showCurrentStory();
      return;
    }

    if (!confirm('Are you sure you want to delete this story? It cannot be undone.')) {
      storiesController.showCurrentStory();
      return;
    }

    try {
      await window.CS_API.stories.delete(story._id);
      window.CS_UI.showToast('Story deleted successfully', 'success');

      // Reload stories from server
      const storiesRes = await window.CS_API.stories.getAll();
      window.CS_STATE.storiesGrouped = storiesRes.data || [];
      storiesController.renderStoriesBar(window.CS_STATE.storiesGrouped);

      // Refresh profile header if currently on profile view
      if (window.CS_STATE.currentView === 'profile' && window.CS_PROFILE && window.CS_STATE.currentProfileUser) {
        window.CS_PROFILE.renderProfileHeader(window.CS_STATE.currentProfileUser);
      }

      // Check if this user still has remaining stories
      const updatedGroupIndex = window.CS_STATE.storiesGrouped.findIndex((g) => {
        const uid = String(g.user?._id || g.user || '');
        const uname = String(g.user?.username || '').toLowerCase();
        return (storyUserId && uid === storyUserId) || (storyUsername && uname === storyUsername);
      });

      if (updatedGroupIndex !== -1) {
        const updatedGroup = window.CS_STATE.storiesGrouped[updatedGroupIndex];
        storiesController.currentUserGroupIndex = updatedGroupIndex;
        storiesController.currentSegmentIndex = Math.min(
          storiesController.currentSegmentIndex,
          updatedGroup.stories.length - 1
        );
        storiesController.showCurrentStory();
      } else {
        // No remaining stories for this user: close viewer cleanly
        storiesController.closeViewer();
      }
    } catch (err) {
      window.CS_UI.showToast(err.message || 'Failed to delete story', 'error');
      storiesController.showCurrentStory();
    }
  },

  // Open story viewer directly for a specific user ID or username
  openViewerForUser: (userIdOrUsername) => {
    const groups = window.CS_STATE.storiesGrouped || [];
    const target = String(userIdOrUsername || '');
    const idx = groups.findIndex((g) => {
      const uid = String(g.user?._id || g.user || '');
      const uname = String(g.user?.username || '');
      return (target && uid === target) || (target && uname.toLowerCase() === target.toLowerCase());
    });

    if (idx !== -1) {
      storiesController.openViewer(idx, 0);
    } else {
      window.CS_UI.showToast('No active stories found for this user', 'info');
    }
  },

  // Open Create Story Modal
  openCreateStoryModal: () => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to add a story', 'info');
      return;
    }
    window.CS_UI.openModal('createStoryModal');
  },

  // Setup Story Creation Handlers
  setupCreateStoryHandlers: () => {
    const form = document.getElementById('createStoryForm');
    const fileInput = document.getElementById('storyFileInput');
    const urlInput = document.getElementById('storyUrlInput');
    const previewContainer = document.getElementById('storyPreviewContainer');
    const previewImg = document.getElementById('storyPreviewImg');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            previewImg.src = evt.target.result;
            previewContainer.style.display = 'block';
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
          previewImg.src = val;
          previewContainer.style.display = 'block';
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const caption = document.getElementById('storyCaptionInput').value.trim();
        const file = fileInput.files && fileInput.files[0];
        const url = urlInput.value.trim();

        if (!file && !url) {
          window.CS_UI.showToast('Please provide an image for the story', 'error');
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Sharing Story...';
          }

          if (file) {
            const formData = new FormData();
            formData.append('media', file);
            formData.append('caption', caption);
            await window.CS_API.stories.create(formData);
          } else {
            await window.CS_API.stories.create({
              mediaUrl: url,
              caption,
            });
          }

          // Reload stories
          const storiesRes = await window.CS_API.stories.getAll();
          window.CS_STATE.storiesGrouped = storiesRes.data || [];
          storiesController.renderStoriesBar(window.CS_STATE.storiesGrouped);

          // Also refresh profile header if viewing a profile
          if (window.CS_STATE.currentView === 'profile' && window.CS_PROFILE && window.CS_STATE.currentProfileUser) {
            window.CS_PROFILE.renderProfileHeader(window.CS_STATE.currentProfileUser);
          }

          window.CS_UI.closeModal('createStoryModal');
          window.CS_UI.showToast('Story added to your circle! It will disappear after 24 hours. 🌟', 'success');
          form.reset();
          if (previewContainer) previewContainer.style.display = 'none';
        } catch (err) {
          window.CS_UI.showToast(err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Add to Story';
          }
        }
      });
    }
  },
};

window.CS_STORIES = storiesController;
