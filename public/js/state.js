// Central State Management for ConnectSphere
const state = {
  currentUser: null,
  currentView: 'feed', // 'feed' | 'profile' | 'explore'
  feedType: 'foryou', // 'foryou' | 'following'
  activeTag: '',
  posts: [],
  suggestions: [],
  storiesGrouped: [],
  activeStoryIndex: 0,
  activeStoryUserIndex: 0,
  currentProfileUser: null,
  profileTab: 'posts', // 'posts' | 'saved'

  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },

  notify(event, payload) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, payload);
      } catch (err) {
        console.error('State notification error:', err);
      }
    });
  },

  setCurrentUser(user) {
    this.currentUser = user;
    this.notify('userChanged', user);
  },

  setPosts(posts) {
    this.posts = posts;
    this.notify('postsChanged', posts);
  },

  addPost(post) {
    this.posts.unshift(post);
    this.notify('postAdded', post);
  },

  removePost(postId) {
    this.posts = this.posts.filter((p) => p._id !== postId);
    this.notify('postRemoved', postId);
  },

  isLoggedIn() {
    return !!this.currentUser && !!localStorage.getItem('cs_token');
  },
};

window.CS_STATE = state;
