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

    if (currentUser) {
      html += `
        <!-- Add Story Item -->
        <div class="story-item" onclick="window.CS_STORIES.openCreateStoryModal()">
          <div class="story-add-wrapper">
            <img src="${currentUser.avatar || window.CS_UI.getDefaultAvatar(currentUser.name)}" alt="You" class="avatar avatar-sm">
            <div class="story-add-badge">+</div>
          </div>
          <span class="story-username">Your Story</span>
        </div>
      `;
    }

    if (hasStories) {
      userStoriesList.forEach((group, groupIdx) => {
        const user = group.user;
        if (!user) return;
        html += `
          <div class="story-item" onclick="window.CS_STORIES.openViewer(${groupIdx}, 0)">
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

          window.CS_UI.closeModal('createStoryModal');
          window.CS_UI.showToast('Story added to your circle! 🌟', 'success');
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
