// Posts Controller for ConnectSphere
const postsController = {
  // Render full feed
  renderFeed: (posts, containerId = 'feedPostsContainer') => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
          <div style="font-size: 3rem; margin-bottom: 12px;">🌟</div>
          <h3 style="margin-bottom: 8px;">No posts yet in this feed</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px;">
            Be the first to share an inspiring update, project, or photo!
          </p>
          <button class="btn btn-primary" onclick="window.CS_POSTS.openCreateModal()">
            Create First Post
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map((post) => postsController.createPostCardHTML(post)).join('');
  },

  // Generate single post card HTML
  createPostCardHTML: (post) => {
    const isOwner = window.CS_STATE.currentUser && (window.CS_STATE.currentUser._id === (post.user?._id || post.user));
    const authorName = post.user?.name || 'ConnectSphere User';
    const authorUsername = post.user?.username || 'user';
    const authorAvatar = post.user?.avatar || window.CS_UI.getDefaultAvatar(authorName);
    const timeAgo = window.CS_UI.formatTimeAgo(post.createdAt);
    const formattedCaption = window.CS_UI.formatTextWithTags(post.caption);
    const likeCount = post.likes ? post.likes.length : 0;
    const isLiked = !!post.isLiked;
    const isSaved = !!post.isSaved;
    const comments = post.comments || [];
    const filterClass = post.filter ? `filter-${post.filter}` : 'filter-normal';

    // Show recent 2 comments or none
    const commentsPreviewHTML = comments
      .slice(-3)
      .map(
        (c) => `
        <div class="comment-item" id="comment-${c._id}">
          <div class="comment-content">
            <span class="comment-author" onclick="window.CS_APP.openProfile('${c.user?.username || ''}')">
              ${c.user?.username || 'user'}
            </span>
            <span>${c.text}</span>
          </div>
          ${
            (window.CS_STATE.currentUser &&
              (window.CS_STATE.currentUser._id === c.user?._id ||
                window.CS_STATE.currentUser._id === (post.user?._id || post.user)))
              ? `<button class="comment-delete-btn" onclick="window.CS_POSTS.deleteComment('${post._id}', '${c._id}')" title="Delete comment">✕</button>`
              : ''
          }
        </div>
      `
      )
      .join('');

    return `
      <article class="post-card fade-in" id="post-${post._id}">
        <!-- Post Header -->
        <div class="post-header">
          <div class="post-author-wrapper" onclick="window.CS_APP.openProfile('${authorUsername}')">
            <div class="avatar-story-ring">
              <img src="${authorAvatar}" alt="${authorName}" class="avatar avatar-sm">
            </div>
            <div class="post-author-info">
              <span class="post-author-name">
                ${authorName}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9" fill="none" stroke="#fff" stroke-width="2.5"></polyline></svg>
              </span>
              <div class="post-meta">
                <span>@${authorUsername}</span>
                <span>•</span>
                <span>${timeAgo}</span>
                ${post.location ? `<span>•</span> <span>📍 ${post.location}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="position: relative;">
            <button class="post-more-btn" onclick="window.CS_POSTS.toggleMenu(event, '${post._id}')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
            </button>
            <div class="post-menu-dropdown" id="menu-${post._id}">
              <div class="dropdown-item" onclick="window.CS_POSTS.copyLink('${post._id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                Copy Link
              </div>
              ${
                isOwner
                  ? `
                <div class="dropdown-item danger" onclick="window.CS_POSTS.deletePost('${post._id}')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  Delete Post
                </div>
              `
                  : ''
              }
            </div>
          </div>
        </div>

        <!-- Post Media -->
        <div class="post-media-container" ondblclick="window.CS_POSTS.handleDoubleTapLike('${post._id}')">
          <img src="${post.mediaUrl}" alt="Post media" class="post-media-image ${filterClass}" loading="lazy">
          <div class="post-heart-burst" id="burst-${post._id}">
            <svg width="96" height="96" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="post-actions">
          <div class="post-actions-left">
            <button class="action-btn ${isLiked ? 'liked' : ''}" id="like-btn-${post._id}" onclick="window.CS_POSTS.toggleLike('${post._id}')">
              <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span id="like-count-${post._id}">${likeCount}</span>
            </button>

            <button class="action-btn" onclick="window.CS_POSTS.focusCommentInput('${post._id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span id="comment-count-${post._id}">${comments.length}</span>
            </button>

            <button class="action-btn" onclick="window.CS_POSTS.copyLink('${post._id}')" title="Share post">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>

          <button class="action-btn ${isSaved ? 'saved' : ''}" id="save-btn-${post._id}" onclick="window.CS_POSTS.toggleSave('${post._id}')" title="Save post">
            <svg viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>

        <!-- Social Proof Likes -->
        <div class="post-likes-summary" id="likes-summary-${post._id}">
          ${likeCount === 0 ? 'Be the first to like this' : `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
        </div>

        <!-- Caption -->
        ${
          post.caption
            ? `
          <div class="post-caption-section">
            <span class="caption-author" onclick="window.CS_APP.openProfile('${authorUsername}')">${authorUsername}</span>
            <span>${formattedCaption}</span>
          </div>
        `
            : ''
        }

        <!-- Comments -->
        <div class="post-comments-section">
          ${
            comments.length > 3
              ? `<span class="view-all-comments-btn" onclick="window.CS_POSTS.toggleAllComments('${post._id}')">View all ${comments.length} comments</span>`
              : ''
          }
          <div class="comments-list" id="comments-list-${post._id}">
            ${commentsPreviewHTML}
          </div>
        </div>

        <!-- Comment Input Bar -->
        <form class="post-comment-input-bar" onsubmit="window.CS_POSTS.submitComment(event, '${post._id}')">
          <input type="text" class="comment-input" id="input-comment-${post._id}" placeholder="Add a comment as ${window.CS_STATE.currentUser?.username || 'guest'}..." autocomplete="off">
          <button type="submit" class="btn-post-comment">Post</button>
        </form>
      </article>
    `;
  },

  // Double tap to like with Instagram-style heart burst
  handleDoubleTapLike: async (postId) => {
    const burst = document.getElementById(`burst-${postId}`);
    if (burst) {
      burst.classList.remove('animate');
      // Trigger reflow
      void burst.offsetWidth;
      burst.classList.add('animate');
    }

    const likeBtn = document.getElementById(`like-btn-${postId}`);
    if (likeBtn && !likeBtn.classList.contains('liked')) {
      await postsController.toggleLike(postId);
    }
  },

  // Toggle Like API
  toggleLike: async (postId) => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to like posts', 'info');
      return;
    }

    try {
      const res = await window.CS_API.posts.toggleLike(postId);
      const btn = document.getElementById(`like-btn-${postId}`);
      const countEl = document.getElementById(`like-count-${postId}`);
      const summaryEl = document.getElementById(`likes-summary-${postId}`);

      if (btn) {
        if (res.isLiked) {
          btn.classList.add('liked');
          btn.querySelector('svg').setAttribute('fill', 'currentColor');
        } else {
          btn.classList.remove('liked');
          btn.querySelector('svg').setAttribute('fill', 'none');
        }
      }

      if (countEl) countEl.innerText = res.likeCount;
      if (summaryEl) {
        summaryEl.innerText =
          res.likeCount === 0
            ? 'Be the first to like this'
            : `${res.likeCount} ${res.likeCount === 1 ? 'like' : 'likes'}`;
      }
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Focus comment input
  focusCommentInput: (postId) => {
    const input = document.getElementById(`input-comment-${postId}`);
    if (input) input.focus();
  },

  // Submit comment
  submitComment: async (e, postId) => {
    e.preventDefault();
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to comment', 'info');
      return;
    }

    const input = document.getElementById(`input-comment-${postId}`);
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    input.value = '';

    try {
      const res = await window.CS_API.posts.addComment(postId, text);
      const commentsList = document.getElementById(`comments-list-${postId}`);
      const commentCountEl = document.getElementById(`comment-count-${postId}`);

      if (commentCountEl) commentCountEl.innerText = res.commentCount;

      if (commentsList) {
        const commentHTML = `
          <div class="comment-item fade-in" id="comment-${res.comment._id}">
            <div class="comment-content">
              <span class="comment-author" onclick="window.CS_APP.openProfile('${res.comment.user?.username || ''}')">
                ${res.comment.user?.username || 'you'}
              </span>
              <span>${res.comment.text}</span>
            </div>
            <button class="comment-delete-btn" onclick="window.CS_POSTS.deleteComment('${postId}', '${res.comment._id}')" title="Delete comment">✕</button>
          </div>
        `;
        commentsList.insertAdjacentHTML('beforeend', commentHTML);
      }

      window.CS_UI.showToast('Comment added!', 'success');
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Delete comment
  deleteComment: async (postId, commentId) => {
    try {
      const res = await window.CS_API.posts.deleteComment(postId, commentId);
      const commentEl = document.getElementById(`comment-${commentId}`);
      if (commentEl) commentEl.remove();

      const countEl = document.getElementById(`comment-count-${postId}`);
      if (countEl) countEl.innerText = res.commentCount;

      window.CS_UI.showToast('Comment deleted', 'info');
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Toggle Save Post
  toggleSave: async (postId) => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to save posts', 'info');
      return;
    }

    try {
      const res = await window.CS_API.posts.toggleSave(postId);
      const btn = document.getElementById(`save-btn-${postId}`);
      if (btn) {
        if (res.isSaved) {
          btn.classList.add('saved');
          btn.querySelector('svg').setAttribute('fill', 'currentColor');
          window.CS_UI.showToast('Post saved to your collection ✨', 'success');
        } else {
          btn.classList.remove('saved');
          btn.querySelector('svg').setAttribute('fill', 'none');
          window.CS_UI.showToast('Post removed from saved collection', 'info');
        }
      }
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Copy post link
  copyLink: (postId) => {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      window.CS_UI.showToast('Link copied to clipboard! 📋', 'success');
    });
    // Hide menu if open
    const menu = document.getElementById(`menu-${postId}`);
    if (menu) menu.classList.remove('show');
  },

  // Toggle 3-dot dropdown menu
  toggleMenu: (event, postId) => {
    event.stopPropagation();
    // Close other open menus
    document.querySelectorAll('.post-menu-dropdown.show').forEach((m) => {
      if (m.id !== `menu-${postId}`) m.classList.remove('show');
    });

    const menu = document.getElementById(`menu-${postId}`);
    if (menu) menu.classList.toggle('show');
  },

  // Delete post
  deletePost: async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await window.CS_API.posts.delete(postId);
      window.CS_STATE.removePost(postId);
      const el = document.getElementById(`post-${postId}`);
      if (el) el.remove();
      window.CS_UI.showToast('Post deleted successfully', 'success');
    } catch (err) {
      window.CS_UI.showToast(err.message, 'error');
    }
  },

  // Open Create Post Modal
  openCreateModal: () => {
    if (!window.CS_STATE.isLoggedIn()) {
      window.CS_AUTH.openAuthModal('login');
      window.CS_UI.showToast('Please log in to create a post', 'info');
      return;
    }
    postsController.resetCreateModal();
    window.CS_UI.openModal('createPostModal');
  },

  // Reset Create Post Modal
  resetCreateModal: () => {
    const form = document.getElementById('createPostForm');
    if (form) form.reset();
    selectedPostFile = null;
    selectedFilter = 'normal';

    const previewContainer = document.getElementById('imagePreviewContainer');
    const dropzone = document.getElementById('postDropzone');
    const previewImg = document.getElementById('imagePreview');

    if (previewContainer) previewContainer.style.display = 'none';
    if (dropzone) dropzone.style.display = 'flex';
    if (previewImg) {
      previewImg.src = '';
      previewImg.className = 'filter-normal';
    }

    document.querySelectorAll('.filter-preset-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.filter === 'normal');
    });
  },

  // Setup Create Post listeners
  setupCreatePostHandlers: () => {
    const fileInput = document.getElementById('postFileInput');
    const urlInput = document.getElementById('postImageUrlInput');
    const dropzone = document.getElementById('postDropzone');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImg = document.getElementById('imagePreview');
    const removePreviewBtn = document.getElementById('removePreviewBtn');
    const form = document.getElementById('createPostForm');

    // Drag and drop handlers
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          postsController.handleFileSelect(e.dataTransfer.files[0]);
        }
      });

      dropzone.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          postsController.handleFileSelect(e.target.files[0]);
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
          previewImg.src = val;
          previewContainer.style.display = 'block';
          dropzone.style.display = 'none';
        }
      });
    }

    if (removePreviewBtn) {
      removePreviewBtn.addEventListener('click', () => {
        postsController.resetCreateModal();
      });
    }

    // Filter preset clicks
    document.querySelectorAll('.filter-preset-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-preset-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        selectedFilter = pill.dataset.filter;
        if (previewImg) {
          previewImg.className = `filter-${selectedFilter}`;
        }
      });
    });

    // Form submit
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const caption = document.getElementById('postCaptionInput').value.trim();
        const location = document.getElementById('postLocationInput').value.trim();
        const tags = document.getElementById('postTagsInput').value.trim();
        const urlVal = urlInput.value.trim();

        if (!selectedPostFile && !urlVal) {
          window.CS_UI.showToast('Please select an image or provide an image URL', 'error');
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Publishing...';
          }

          let response;
          if (selectedPostFile) {
            const formData = new FormData();
            formData.append('media', selectedPostFile);
            formData.append('caption', caption);
            formData.append('location', location);
            formData.append('filter', selectedFilter);
            if (tags) formData.append('tags', tags);
            response = await window.CS_API.posts.create(formData);
          } else {
            response = await window.CS_API.posts.create({
              mediaUrl: urlVal,
              caption,
              location,
              filter: selectedFilter,
              tags,
            });
          }

          window.CS_STATE.addPost(response.post);
          postsController.renderFeed(window.CS_STATE.posts);
          window.CS_UI.closeModal('createPostModal');
          window.CS_UI.showToast('Post published successfully! 🎉', 'success');
        } catch (err) {
          window.CS_UI.showToast(err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Share Post';
          }
        }
      });
    }
  },

  handleFileSelect: (file) => {
    if (!file.type.match('image.*')) {
      window.CS_UI.showToast('Please upload an image file (PNG, JPG, WEBP, GIF)', 'error');
      return;
    }

    selectedPostFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewImg = document.getElementById('imagePreview');
      const previewContainer = document.getElementById('imagePreviewContainer');
      const dropzone = document.getElementById('postDropzone');

      previewImg.src = e.target.result;
      previewContainer.style.display = 'block';
      dropzone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  },
};

let selectedPostFile = null;
let selectedFilter = 'normal';

window.CS_POSTS = postsController;
