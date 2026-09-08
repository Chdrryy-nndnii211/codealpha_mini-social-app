// =========================================================
// Profile Page Logic
// =========================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const currentUser = getUser();
  const urlParams = new URLSearchParams(window.location.search);
  const targetUserId = urlParams.get('id') || (currentUser ? currentUser.id : null);

  if (!targetUserId) {
    showToast('User not specified.', 'error');
    window.location.href = 'feed.html';
    return;
  }

  const isSelf = currentUser && (currentUser.id === targetUserId || currentUser._id === targetUserId);
  renderNavbar(isSelf ? 'profile' : '');

  const profileLoader = document.getElementById('profile-loader');
  const profileCard = document.getElementById('profile-card');
  const userPostsSection = document.getElementById('user-posts-section');
  const userPostsContainer = document.getElementById('user-posts-container');

  const avatarEl = document.getElementById('profile-avatar');
  const usernameEl = document.getElementById('profile-username');
  const emailEl = document.getElementById('profile-email');
  const bioEl = document.getElementById('profile-bio');
  const statPosts = document.getElementById('stat-posts');
  const statFollowers = document.getElementById('stat-followers');
  const statFollowing = document.getElementById('stat-following');
  const actionContainer = document.getElementById('profile-action-container');

  // Modals
  const editModal = document.getElementById('edit-profile-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const editProfileForm = document.getElementById('edit-profile-form');
  const editBioInput = document.getElementById('edit-bio');
  const editAvatarInput = document.getElementById('edit-avatar');
  const bioCharCount = document.getElementById('bio-char-count');
  const saveProfileBtn = document.getElementById('save-profile-btn');

  const usersListModal = document.getElementById('users-list-modal');
  const closeUsersModalBtn = document.getElementById('close-users-modal-btn');
  const usersListTitle = document.getElementById('users-list-title');
  const usersModalBody = document.getElementById('users-modal-body');
  const btnShowFollowers = document.getElementById('btn-show-followers');
  const btnShowFollowing = document.getElementById('btn-show-following');

  let profileData = null;

  // Load user profile & posts
  const loadProfile = async () => {
    const res = await apiFetch(`/users/${targetUserId}`);
    profileLoader.style.display = 'none';

    if (!res.ok) {
      showToast(res.message || 'Failed to load profile.', 'error');
      profileCard.style.display = 'block';
      profileCard.innerHTML = `
        <div class="empty-state">
          <h3>User Not Found</h3>
          <p>${escapeHtml(res.message)}</p>
          <a href="feed.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Back to Feed</a>
        </div>
      `;
      return;
    }

    profileData = res.data.user;
    const posts = res.data.posts || [];

    // Populate profile card
    avatarEl.src = profileData.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${profileData.username}`;
    usernameEl.textContent = `@${profileData.username}`;
    emailEl.textContent = profileData.email;
    bioEl.textContent = profileData.bio || 'No bio yet.';
    statPosts.textContent = posts.length;
    statFollowers.textContent = profileData.followersCount;
    statFollowing.textContent = profileData.followingCount;

    // Render action button
    renderActionButton(profileData);

    profileCard.style.display = 'block';
    userPostsSection.style.display = 'block';

    // Render posts
    renderUserPosts(posts);
  };

  const renderActionButton = (user) => {
    actionContainer.innerHTML = '';

    if (isSelf) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-outline profile-action-btn';
      editBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
        <span>Edit Profile</span>
      `;
      editBtn.addEventListener('click', openEditModal);
      actionContainer.appendChild(editBtn);
    } else {
      const followBtn = document.createElement('button');
      followBtn.className = `btn profile-action-btn ${user.isFollowing ? 'btn-outline' : 'btn-primary'}`;
      followBtn.textContent = user.isFollowing ? 'Following' : 'Follow';

      followBtn.addEventListener('click', async () => {
        const currentlyFollowing = followBtn.textContent.trim() === 'Following';
        const currentCount = parseInt(statFollowers.textContent, 10) || 0;

        // Optimistic update
        const newFollowingState = !currentlyFollowing;
        followBtn.textContent = newFollowingState ? 'Following' : 'Follow';
        followBtn.className = `btn profile-action-btn ${newFollowingState ? 'btn-outline' : 'btn-primary'}`;
        statFollowers.textContent = newFollowingState ? currentCount + 1 : Math.max(0, currentCount - 1);

        const res = await apiFetch(`/users/${targetUserId}/follow`, { method: 'POST' });

        if (!res.ok) {
          // Revert
          followBtn.textContent = currentlyFollowing ? 'Following' : 'Follow';
          followBtn.className = `btn profile-action-btn ${currentlyFollowing ? 'btn-outline' : 'btn-primary'}`;
          statFollowers.textContent = currentCount;
          showToast(res.message || 'Follow action failed.', 'error');
        } else {
          showToast(res.data.message, 'info');
          statFollowers.textContent = res.data.followersCount;
        }
      });

      actionContainer.appendChild(followBtn);
    }
  };

  // Render posts list
  const renderUserPosts = (posts) => {
    userPostsContainer.innerHTML = '';
    if (posts.length === 0) {
      userPostsContainer.innerHTML = `
        <div class="empty-state">
          <h3>No posts yet</h3>
          <p>${isSelf ? "You haven't posted anything yet." : `@${profileData.username} hasn't posted anything yet.`}</p>
        </div>
      `;
      return;
    }

    posts.forEach((post) => {
      // Re-use post card builder from feed.js logic
      const card = createProfilePostCard(post);
      userPostsContainer.appendChild(card);
    });
  };

  const createProfilePostCard = (post) => {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-${post._id}`;

    const author = post.user || profileData || {};
    const authorName = author.username || profileData.username;
    const authorAvatar = author.profilePicture || profileData.profilePicture;
    const authorId = author._id || targetUserId;
    const timeFormatted = formatRelativeTime(post.createdAt);

    let imageHtml = '';
    if (post.image && post.image.trim()) {
      imageHtml = `
        <div class="post-image-container">
          <img src="${escapeHtml(post.image)}" alt="Post image" class="post-image" loading="lazy" onerror="this.parentElement.style.display='none';">
        </div>
      `;
    }

    let deleteBtnHtml = '';
    if (isSelf) {
      deleteBtnHtml = `
        <button class="btn-icon btn-delete-post" data-post-id="${post._id}" title="Delete post">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    }

    const isLiked = Array.isArray(post.likes) && currentUser && post.likes.some((id) => (id._id || id).toString() === currentUser.id);
    const likesCount = post.likes ? post.likes.length : 0;
    const commentsCount = post.comments ? post.comments.length : 0;

    card.innerHTML = `
      <header class="post-header">
        <div class="post-author-info">
          <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="post-author-avatar">
          <div>
            <span class="post-author-name">@${escapeHtml(authorName)}</span>
            <div class="post-timestamp">${timeFormatted}</div>
          </div>
        </div>
        ${deleteBtnHtml}
      </header>

      <div class="post-content">${escapeHtml(post.content)}</div>
      ${imageHtml}

      <footer class="post-actions">
        <button class="action-btn btn-like ${isLiked ? 'liked' : ''}" data-post-id="${post._id}" data-liked="${isLiked}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
          </svg>
          <span class="like-count">${likesCount}</span>
        </button>

        <a href="post.html?id=${post._id}" class="action-btn" title="Comments">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>${commentsCount}</span>
        </a>
      </footer>
    `;

    // Like toggle
    const likeBtn = card.querySelector('.btn-like');
    likeBtn.addEventListener('click', async () => {
      const postId = likeBtn.dataset.postId;
      const currentlyLiked = likeBtn.dataset.liked === 'true';
      const countSpan = likeBtn.querySelector('.like-count');
      const currentCount = parseInt(countSpan.textContent, 10) || 0;

      const newLiked = !currentlyLiked;
      likeBtn.dataset.liked = newLiked ? 'true' : 'false';
      likeBtn.classList.toggle('liked', newLiked);
      countSpan.textContent = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

      const res = await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
      if (!res.ok) {
        likeBtn.dataset.liked = currentlyLiked ? 'true' : 'false';
        likeBtn.classList.toggle('liked', currentlyLiked);
        countSpan.textContent = currentCount;
        showToast(res.message || 'Failed to update like.', 'error');
      } else {
        likeBtn.dataset.liked = res.data.isLiked ? 'true' : 'false';
        likeBtn.classList.toggle('liked', res.data.isLiked);
        countSpan.textContent = res.data.likesCount;
      }
    });

    // Delete post
    const deleteBtn = card.querySelector('.btn-delete-post');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        const res = await apiFetch(`/posts/${post._id}`, { method: 'DELETE' });
        if (!res.ok) {
          showToast(res.message || 'Could not delete post.', 'error');
          return;
        }
        showToast('Post deleted.', 'success');
        card.remove();
        statPosts.textContent = Math.max(0, (parseInt(statPosts.textContent, 10) || 1) - 1);
      });
    }

    return card;
  };

  // Edit Profile Modal handlers
  const openEditModal = () => {
    editBioInput.value = profileData.bio || '';
    editAvatarInput.value = profileData.profilePicture || '';
    bioCharCount.textContent = (profileData.bio || '').length;
    editModal.classList.add('active');
  };

  const closeEditModal = () => {
    editModal.classList.remove('active');
  };

  closeModalBtn.addEventListener('click', closeEditModal);
  cancelEditBtn.addEventListener('click', closeEditModal);

  editBioInput.addEventListener('input', () => {
    bioCharCount.textContent = editBioInput.value.length;
  });

  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bio = editBioInput.value.trim();
    const profilePicture = editAvatarInput.value.trim();

    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Saving...';

    const res = await apiFetch(`/users/${targetUserId}`, {
      method: 'PUT',
      body: JSON.stringify({ bio, profilePicture }),
    });

    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = 'Save Changes';

    if (!res.ok) {
      showToast(res.message || 'Failed to update profile.', 'error');
      return;
    }

    showToast('Profile updated!', 'success');
    closeEditModal();

    // Update state & UI
    profileData.bio = res.data.user.bio;
    profileData.profilePicture = res.data.user.profilePicture;
    bioEl.textContent = profileData.bio || 'No bio yet.';
    avatarEl.src = profileData.profilePicture;

    // Update localStorage user object and navbar
    const storedUser = getUser();
    if (storedUser) {
      storedUser.bio = res.data.user.bio;
      storedUser.profilePicture = res.data.user.profilePicture;
      setUser(storedUser);
      const navAvatar = document.getElementById('nav-user-avatar');
      if (navAvatar) navAvatar.src = storedUser.profilePicture;
    }
  });

  // Followers & Following lists modal
  const showUsersList = async (type) => {
    usersListTitle.textContent = type === 'followers' ? 'Followers' : 'Following';
    usersModalBody.innerHTML = '<div style="text-align: center; padding: 1.5rem;"><div class="spinner spinner-dark" style="margin: 0 auto;"></div></div>';
    usersListModal.classList.add('active');

    const res = await apiFetch(`/users/${targetUserId}/${type}`);
    if (!res.ok) {
      usersModalBody.innerHTML = `<p style="color: var(--danger); text-align: center;">${escapeHtml(res.message)}</p>`;
      return;
    }

    const list = res.data[type] || [];
    if (list.length === 0) {
      usersModalBody.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 1rem;">No ${type} yet.</p>`;
      return;
    }

    usersModalBody.innerHTML = '';
    list.forEach((u) => {
      const row = document.createElement('a');
      row.href = `profile.html?id=${u._id}`;
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '0.75rem';
      row.style.padding = '0.5rem';
      row.style.borderRadius = 'var(--radius-sm)';
      row.style.transition = 'background-color 0.15s ease';
      row.onmouseenter = () => (row.style.backgroundColor = 'var(--bg-input)');
      row.onmouseleave = () => (row.style.backgroundColor = 'transparent)');

      row.innerHTML = `
        <img src="${escapeHtml(u.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`)}" 
             alt="${escapeHtml(u.username)}" 
             style="width: 36px; height: 36px; border-radius: 9999px; object-fit: cover;">
        <div>
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">@${escapeHtml(u.username)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(u.bio || '')}</div>
        </div>
      `;
      usersModalBody.appendChild(row);
    });
  };

  btnShowFollowers.addEventListener('click', () => showUsersList('followers'));
  btnShowFollowing.addEventListener('click', () => showUsersList('following'));
  closeUsersModalBtn.addEventListener('click', () => usersListModal.classList.remove('active'));

  await loadProfile();
});
