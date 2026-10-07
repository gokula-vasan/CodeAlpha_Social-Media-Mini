const http = require('http');

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

async function runTests() {
  console.log('🧪 Starting ConnectSphere Full-Stack Automated Test Suite (Clean Dynamic Suite)...\n');
  let passCount = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
    }
  }

  try {
    // 1. Health Check
    const health = await request('/api/health');
    assert(health.status === 200 && health.body.status === 'online', 'Server health check (/api/health)');

    // 2. Register Primary User
    const ts = Date.now();
    const userA_name = `user_a_${ts}`;
    const regResA = await request('/api/auth/register', 'POST', {
      name: 'Developer One',
      username: userA_name,
      email: `${userA_name}@domain.com`,
      password: 'password123',
      bio: 'Full-stack software engineer',
    });
    assert(regResA.status === 201 && regResA.body.token, 'Register primary user (/api/auth/register)');
    const tokenA = regResA.body.token;
    const userA = regResA.body.user;

    // 3. Register Secondary User
    const userB_name = `user_b_${ts}`;
    const regResB = await request('/api/auth/register', 'POST', {
      name: 'Designer Two',
      username: userB_name,
      email: `${userB_name}@domain.com`,
      password: 'password123',
      bio: 'UI/UX Visual Architect',
    });
    assert(regResB.status === 201 && regResB.body.token, 'Register secondary user (/api/auth/register)');
    const tokenB = regResB.body.token;
    const userB = regResB.body.user;

    // 4. Login User A
    const loginRes = await request('/api/auth/login', 'POST', {
      loginIdentifier: `${userA_name}@domain.com`,
      password: 'password123',
    });
    assert(loginRes.status === 200 && loginRes.body.token, 'Login user (/api/auth/login)');

    // 5. Get Current User (GET /api/auth/me)
    const meRes = await request('/api/auth/me', 'GET', null, tokenA);
    assert(meRes.status === 200 && meRes.body.user.username === userA_name, 'Get authenticated user (/api/auth/me)');

    // 6. Update Profile (PUT /api/auth/update-profile)
    const updateRes = await request('/api/auth/update-profile', 'PUT', {
      name: 'Developer One (Updated)',
      location: 'San Francisco, CA',
    }, tokenA);
    assert(updateRes.status === 200 && updateRes.body.user.location === 'San Francisco, CA', 'Update user profile (/api/auth/update-profile)');

    // 7. Create New Post (POST /api/posts)
    const createPostRes = await request('/api/posts', 'POST', {
      mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
      caption: 'Testing dynamic post creation and tags #coding #fullstack',
      location: 'Studio One',
      filter: 'cool',
    }, tokenA);
    assert(createPostRes.status === 201 && createPostRes.body.post._id, 'Create post (/api/posts)');
    const postId = createPostRes.body.post._id;

    // 8. Fetch Feed Posts (GET /api/posts)
    const feedRes = await request('/api/posts', 'GET', null, tokenA);
    assert(feedRes.status === 200 && feedRes.body.posts.some(p => p._id === postId), 'Fetch feed posts (/api/posts)');

    // 9. Like Post by User B (PUT /api/posts/:id/like)
    const likeRes = await request(`/api/posts/${postId}/like`, 'PUT', null, tokenB);
    assert(likeRes.status === 200 && likeRes.body.isLiked === true, 'Toggle like post (/api/posts/:id/like)');

    // 10. Add Comment by User B (POST /api/posts/:id/comment)
    const commentRes = await request(`/api/posts/${postId}/comment`, 'POST', {
      text: 'Dynamic comment test verification 🚀',
    }, tokenB);
    assert(commentRes.status === 201 && commentRes.body.comment.text.includes('Dynamic'), 'Add comment to post (/api/posts/:id/comment)');
    const commentId = commentRes.body.comment._id;

    // 11. Delete Comment by Author (DELETE /api/posts/:id/comment/:commentId)
    const delCommentRes = await request(`/api/posts/${postId}/comment/${commentId}`, 'DELETE', null, tokenB);
    assert(delCommentRes.status === 200, 'Delete comment (/api/posts/:id/comment/:commentId)');

    // 12. Save Post to Collection (PUT /api/posts/:id/save)
    const saveRes = await request(`/api/posts/${postId}/save`, 'PUT', null, tokenB);
    assert(saveRes.status === 200 && saveRes.body.isSaved === true, 'Bookmark post (/api/posts/:id/save)');

    // 13. Follow User (PUT /api/users/:id/follow)
    const followRes = await request(`/api/users/${userA._id}/follow`, 'PUT', null, tokenB);
    assert(followRes.status === 200 && followRes.body.isFollowing === true, 'Follow user (/api/users/:id/follow)');

    // 14. Search Users (GET /api/users/search?q=...)
    const searchRes = await request(`/api/users/search?q=${userA_name}`);
    assert(searchRes.status === 200 && searchRes.body.users.some(u => u.username === userA_name), 'Search users dynamically (/api/users/search)');

    // 15. Real Trending Tags (GET /api/posts/trending-tags)
    const trendingRes = await request('/api/posts/trending-tags');
    assert(trendingRes.status === 200 && Array.isArray(trendingRes.body.tags), 'Fetch real dynamic trending tags (/api/posts/trending-tags)');

    // 16. Delete Created Post by Owner (DELETE /api/posts/:id)
    const delPostRes = await request(`/api/posts/${postId}`, 'DELETE', null, tokenA);
    assert(delPostRes.status === 200, 'Delete post by owner (/api/posts/:id)');

    // 17. Cleanup Test Users
    try {
      const mongoose = require('mongoose');
      require('dotenv').config();
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectsphere');
      const db = mongoose.connection.db;
      const allUsers = await db.collection('users').find({}).toArray();
      const testList = allUsers.filter(u => 
        u.username.startsWith('user_a_') || 
        u.username.startsWith('user_b_') || 
        u.username.startsWith('tester_') ||
        u.username.startsWith('owner_') ||
        u.username.startsWith('other_') ||
        u.username.startsWith('vasantest_')
      );
      for (const t of testList) {
        await db.collection('posts').deleteMany({ user: t._id });
        await db.collection('stories').deleteMany({ user: t._id });
        await db.collection('users').deleteOne({ _id: t._id });
      }
      await mongoose.disconnect();
    } catch (_) {}

    console.log(`\n🎉 Dynamic Test Suite Completed: ${passCount} of ${totalTests} tests passed!`);
  } catch (error) {
    console.error('Fatal test error:', error);
  }
}

runTests();
