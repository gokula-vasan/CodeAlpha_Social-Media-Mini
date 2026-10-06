// ConnectSphere API Service
const API_BASE = '/api';

const getHeaders = (isFormData = false) => {
  const token = localStorage.getItem('cs_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data;
};

const api = {
  // Authentication
  auth: {
    login: async (loginIdentifier, password) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginIdentifier, password }),
      });
      return handleResponse(res);
    },
    register: async (userData) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return handleResponse(res);
    },
    getMe: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    updateProfile: async (profileData) => {
      const res = await fetch(`${API_BASE}/auth/update-profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(profileData),
      });
      return handleResponse(res);
    },
  },

  // Posts
  posts: {
    getFeed: async (feedType = 'foryou', tag = '', search = '', page = 1) => {
      const params = new URLSearchParams();
      if (feedType) params.append('feedType', feedType);
      if (tag) params.append('tag', tag);
      if (search) params.append('search', search);
      if (page) params.append('page', page);

      const res = await fetch(`${API_BASE}/posts?${params.toString()}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/posts/${id}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (formData) => {
      // Determine if formData is an instance of FormData or plain object
      const isFormData = formData instanceof FormData;
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: getHeaders(isFormData),
        body: isFormData ? formData : JSON.stringify(formData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/posts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    toggleLike: async (id) => {
      const res = await fetch(`${API_BASE}/posts/${id}/like`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    addComment: async (id, text) => {
      const res = await fetch(`${API_BASE}/posts/${id}/comment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text }),
      });
      return handleResponse(res);
    },
    deleteComment: async (postId, commentId) => {
      const res = await fetch(`${API_BASE}/posts/${postId}/comment/${commentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    toggleSave: async (id) => {
      const res = await fetch(`${API_BASE}/posts/${id}/save`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getTrendingTags: async () => {
      const res = await fetch(`${API_BASE}/posts/trending-tags`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Users
  users: {
    getProfile: async (username) => {
      const res = await fetch(`${API_BASE}/users/profile/${username}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    toggleFollow: async (id) => {
      const res = await fetch(`${API_BASE}/users/${id}/follow`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getSuggestions: async () => {
      const res = await fetch(`${API_BASE}/users/suggestions`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    search: async (q) => {
      const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(q)}`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getSavedPosts: async () => {
      const res = await fetch(`${API_BASE}/users/saved-posts`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getAll: async () => {
      const res = await fetch(`${API_BASE}/users/accounts`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Stories
  stories: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/stories`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (formData) => {
      const isFormData = formData instanceof FormData;
      const res = await fetch(`${API_BASE}/stories`, {
        method: 'POST',
        headers: getHeaders(isFormData),
        body: isFormData ? formData : JSON.stringify(formData),
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${API_BASE}/stories/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  // Notifications
  notifications: {
    get: async () => {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    markRead: async () => {
      const res = await fetch(`${API_BASE}/notifications/mark-read`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
};

window.CS_API = api;
