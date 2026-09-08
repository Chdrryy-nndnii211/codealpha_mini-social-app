const http = require('http');
require('dotenv').config();
const { app, startServer } = require('./server');
const mongoose = require('mongoose');
const { disconnectDB } = require('./config/db');

// Helper to make HTTP requests
const request = (server, method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const postData = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json',
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
};

const runTests = async () => {
  console.log('\n=============================================');
  console.log('🧪 RUNNING COMPREHENSIVE BACKEND API TESTS');
  console.log('=============================================\n');

  let server;
  try {
    server = await startServer();
  } catch (err) {
    console.error('Failed to start test server:', err);
    process.exit(1);
  }

  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failedCount++;
    }
  };

  try {
    // 1. Health check
    const health = await request(server, 'GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'ok', 'GET /api/health returns 200 ok');

    // 2. Auth: Signup user 1
    const user1Data = {
      username: `test_dev_${Date.now()}`,
      email: `dev_${Date.now()}@test.com`,
      password: 'password123',
      bio: 'Just a test developer',
    };
    const signup1 = await request(server, 'POST', '/api/auth/signup', user1Data);
    assert(signup1.status === 201 && signup1.body.token, 'POST /api/auth/signup creates user and returns JWT token');
    const token1 = signup1.body.token;
    const user1Id = signup1.body.user.id;

    // 3. Auth: Duplicate email validation
    const signupDup = await request(server, 'POST', '/api/auth/signup', user1Data);
    assert(signupDup.status === 400, 'POST /api/auth/signup rejects duplicate email with 400');

    // 4. Auth: Login
    const login = await request(server, 'POST', '/api/auth/login', {
      email: user1Data.email,
      password: 'password123',
    });
    assert(login.status === 200 && login.body.token, 'POST /api/auth/login succeeds with valid credentials');

    // 5. Auth: Login wrong password
    const loginFail = await request(server, 'POST', '/api/auth/login', {
      email: user1Data.email,
      password: 'wrongpassword',
    });
    assert(loginFail.status === 400, 'POST /api/auth/login rejects wrong password with 400');

    // 6. Auth: GET /api/auth/me (Protected)
    const getMe = await request(server, 'GET', '/api/auth/me', null, token1);
    assert(getMe.status === 200 && getMe.body.user.username === user1Data.username, 'GET /api/auth/me returns authenticated user');

    // 7. Auth: Protected route without token returns 401
    const unauthMe = await request(server, 'GET', '/api/auth/me');
    assert(unauthMe.status === 401, 'Protected route without token returns 401');

    // 8. User: Update own profile
    const updateProfile = await request(server, 'PUT', `/api/users/${user1Id}`, {
      bio: 'Updated bio testing!',
      profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    }, token1);
    assert(updateProfile.status === 200 && updateProfile.body.user.bio === 'Updated bio testing!', 'PUT /api/users/:id updates profile');

    // 9. Posts: Create post
    const postData = {
      content: 'Hello World! This is an automated test post 🚀',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
    };
    const createPost = await request(server, 'POST', '/api/posts', postData, token1);
    assert(createPost.status === 201 && createPost.body.post.content === postData.content, 'POST /api/posts creates new post');
    const postId = createPost.body.post._id;

    // 10. Posts: Empty content validation
    const createEmpty = await request(server, 'POST', '/api/posts', { content: '' }, token1);
    assert(createEmpty.status === 400, 'POST /api/posts rejects empty content with 400');

    // 11. Posts: GET /api/posts (Feed)
    const getFeed = await request(server, 'GET', '/api/posts', null, token1);
    assert(getFeed.status === 200 && Array.isArray(getFeed.body.posts) && getFeed.body.posts.length > 0, 'GET /api/posts returns feed array');

    // 12. Posts: Like toggle (Like)
    const likePost = await request(server, 'POST', `/api/posts/${postId}/like`, null, token1);
    assert(likePost.status === 200 && likePost.body.isLiked === true && likePost.body.likesCount === 1, 'POST /api/posts/:id/like likes post');

    // 13. Posts: Like toggle (Unlike)
    const unlikePost = await request(server, 'POST', `/api/posts/${postId}/like`, null, token1);
    assert(unlikePost.status === 200 && unlikePost.body.isLiked === false && unlikePost.body.likesCount === 0, 'POST /api/posts/:id/like unlikes post');

    // 14. Comments: Add comment
    const addComment = await request(server, 'POST', `/api/posts/${postId}/comments`, {
      text: 'This is a test comment!',
    }, token1);
    assert(addComment.status === 201 && addComment.body.comment.text === 'This is a test comment!', 'POST /api/posts/:id/comments adds comment');
    const commentId = addComment.body.comment._id;

    // 15. Posts: GET single post with comments
    const getSinglePost = await request(server, 'GET', `/api/posts/${postId}`, null, token1);
    assert(
      getSinglePost.status === 200 &&
      getSinglePost.body.post.comments.length === 1 &&
      getSinglePost.body.post.comments[0].text === 'This is a test comment!',
      'GET /api/posts/:id returns single post with populated comments'
    );

    // 16. Users: Signup user 2
    const user2Data = {
      username: `test_user2_${Date.now()}`,
      email: `user2_${Date.now()}@test.com`,
      password: 'password123',
    };
    const signup2 = await request(server, 'POST', '/api/auth/signup', user2Data);
    const token2 = signup2.body.token;
    const user2Id = signup2.body.user.id;

    // 17. Users: User 2 follows User 1
    const followUser = await request(server, 'POST', `/api/users/${user1Id}/follow`, null, token2);
    assert(followUser.status === 200 && followUser.body.isFollowing === true && followUser.body.followersCount === 1, 'POST /api/users/:id/follow follows user');

    // 18. Users: Get user followers & following lists
    const getFollowers = await request(server, 'GET', `/api/users/${user1Id}/followers`);
    assert(getFollowers.status === 200 && getFollowers.body.followers.length === 1, 'GET /api/users/:id/followers returns followers list');

    const getFollowing = await request(server, 'GET', `/api/users/${user2Id}/following`);
    assert(getFollowing.status === 200 && getFollowing.body.following.length === 1, 'GET /api/users/:id/following returns following list');

    // 19. Users: User 2 unfollows User 1
    const unfollowUser = await request(server, 'POST', `/api/users/${user1Id}/follow`, null, token2);
    assert(unfollowUser.status === 200 && unfollowUser.body.isFollowing === false && unfollowUser.body.followersCount === 0, 'POST /api/users/:id/follow unfollows user');

    // 20. Users: Cannot follow oneself
    const selfFollow = await request(server, 'POST', `/api/users/${user1Id}/follow`, null, token1);
    assert(selfFollow.status === 400, 'POST /api/users/:id/follow returns 400 when trying to follow oneself');

    // 21. Authorization guard: User 2 cannot delete User 1's post
    const forbiddenDeletePost = await request(server, 'DELETE', `/api/posts/${postId}`, null, token2);
    assert(forbiddenDeletePost.status === 403, 'DELETE /api/posts/:id returns 403 when deleting another users post');

    // 22. Comments: Delete comment
    const deleteComment = await request(server, 'DELETE', `/api/comments/${commentId}`, null, token1);
    assert(deleteComment.status === 200, 'DELETE /api/comments/:id deletes own comment');

    // 23. Posts: User 1 deletes own post
    const deletePost = await request(server, 'DELETE', `/api/posts/${postId}`, null, token1);
    assert(deletePost.status === 200, 'DELETE /api/posts/:id deletes own post');

    console.log('\n=============================================');
    console.log(`📊 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('=============================================\n');

    server.close();
    await disconnectDB();
    process.exit(failedCount === 0 ? 0 : 1);
  } catch (error) {
    console.error('Test execution error:', error);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
};

runTests();
