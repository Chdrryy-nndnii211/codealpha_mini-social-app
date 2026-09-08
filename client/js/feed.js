// =========================================================
// Feed Page Logic
// =========================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  renderNavbar('feed');

  const currentUser = getUser();
  const createPostAvatar = document.getElementById('create-post-avatar');
  if (createPostAvatar && currentUser) {
    createPostAvatar.src = currentUser.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;
  }

  const postsContainer = document.getElementById('posts-container');
  const feedLoader = document.getElementById('feed-loader');
  const createPostForm = document.getElementById('create-post-form');
  const contentInput = document.getElementById('post-content-input');
  const imageInput = document.getElementById('post-image-input');
  const imageUrlBox = document.getElementById('image-url-box');
  const toggleImageBtn = document.getElementById('toggle-image-btn');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const imagePreview = document.getElementById('image-preview');
  const btnRemovePreview = document.getElementById('btn-remove-preview');
  const submitPostBtn = document.getElementById('submit-post-btn');

  // Toggle Image URL input
  toggleImageBtn.addEventListener('click', () => {
    const isVisible = imageUrlBox.style.display === 'block';
    imageUrlBox.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) imageInput.focus();
  });

  // Image input preview listener
  imageInput.addEventListener('input', () => {
    const url = imageInput.value.trim();
    if (url) {
      imagePreview.src = url;
      imagePreviewContainer.style.display = 'block';
    } else {
      imagePreviewContainer.style.display = 'none';
    }
  });

  btnRemovePreview.addEventListener('click', () => {
    imageInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
  });

  // Handle post creation
  createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = contentInput.value.trim();
    const image = imageInput.value.trim();

    if (!content) {
      showToast('Please enter something to post.', 'error');
      contentInput.focus();
      return;
    }

    const originalText = submitPostBtn.innerHTML;
    submitPostBtn.disabled = true;
    submitPostBtn.innerHTML = `<div class="spinner" style="width: 16px; height: 16px;"></div>`;

    const res = await apiFetch('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, image }),
    });

    submitPostBtn.disabled = false;
    submitPostBtn.innerHTML = originalText;

    if (!res.ok) {
      showToast(res.message || 'Failed to publish post.', 'error');
      return;
    }

    showToast('Post published!', 'success');

    // Reset form
    contentInput.value = '';
    imageInput.value = '';
    imageUrlBox.style.display = 'none';
    imagePreviewContainer.style.display = 'none';

    // Prepend new post to container
    const emptyState = document.getElementById('empty-feed-state');
    if (emptyState) emptyState.remove();

    const postElement = createPostCardElement(res.data.post);
    postsContainer.prepend(postElement);
  });

  // Load feed posts
  const loadPosts = async () => {
    const res = await apiFetch('/posts');
    feedLoader.style.display = 'none';
    postsContainer.style.display = 'block';

    if (!res.ok) {
      postsContainer.innerHTML = `
        <div class="empty-state">
          <h3>Failed to load posts</h3>
          <p>${escapeHtml(res.message)}</p>
          <button class="btn btn-outline btn-sm" style="margin-top: 1rem;" onclick="window.location.reload()">Retry</button>
        </div>
      `;
      return;
    }

    const posts = res.data.posts || [];
    if (posts.length === 0) {
      postsContainer.innerHTML = `
        <div class="empty-state" id="empty-feed-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3>No posts yet</h3>
          <p>Be the first one to share an update!</p>
        </div>
      `;
      return;
    }

    postsContainer.innerHTML = '';
    posts.forEach((post) => {
      const card = createPostCardElement(post);
      postsContainer.appendChild(card);
    });
  };

  await loadPosts();
});

// Helper to build a Post Card DOM element
const createPostCardElement = (post) => {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.id = `post-${post._id}`;

  const author = post.user || {};
  const authorName = author.username || 'User';
  const authorAvatar = author.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorName}`;
  const authorId = author._id || author.id;
  const timeFormatted = formatRelativeTime(post.createdAt);
  const currentUser = getUser();
  const isAuthor = currentUser && authorId && (currentUser.id === authorId || currentUser._id === authorId);

  let imageHtml = '';
  if (post.image && post.image.trim()) {
    imageHtml = `
      <div class="post-image-container">
        <img src="${escapeHtml(post.image)}" alt="Post image" class="post-image" loading="lazy" onerror="this.parentElement.style.display='none';">
      </div>
    `;
  }

  let deleteBtnHtml = '';
  if (isAuthor) {
    deleteBtnHtml = `
      <button class="btn-icon btn-delete-post" data-post-id="${post._id}" title="Delete post">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;
  }

  const isLiked = !!post.isLiked;
  const likesCount = post.likesCount !== undefined ? post.likesCount : (post.likes ? post.likes.length : 0);
  const commentsCount = post.commentsCount !== undefined ? post.commentsCount : (post.comments ? post.comments.length : 0);

  card.innerHTML = `
    <header class="post-header">
      <div class="post-author-info">
        <a href="profile.html?id=${authorId}">
          <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="post-author-avatar">
        </a>
        <div>
          <a href="profile.html?id=${authorId}" class="post-author-name">@${escapeHtml(authorName)}</a>
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

  // Attach Event Listeners
  // 1. Optimistic Like Toggle
  const likeBtn = card.querySelector('.btn-like');
  likeBtn.addEventListener('click', async () => {
    const postId = likeBtn.dataset.postId;
    const currentlyLiked = likeBtn.dataset.liked === 'true';
    const countSpan = likeBtn.querySelector('.like-count');
    const currentCount = parseInt(countSpan.textContent, 10) || 0;

    // Optimistic UI update
    const newLikedState = !currentlyLiked;
    const newCount = newLikedState ? currentCount + 1 : Math.max(0, currentCount - 1);

    likeBtn.dataset.liked = newLikedState ? 'true' : 'false';
    likeBtn.classList.toggle('liked', newLikedState);
    countSpan.textContent = newCount;

    // Send request to server
    const res = await apiFetch(`/posts/${postId}/like`, { method: 'POST' });

    if (!res.ok) {
      // Revert if error
      likeBtn.dataset.liked = currentlyLiked ? 'true' : 'false';
      likeBtn.classList.toggle('liked', currentlyLiked);
      countSpan.textContent = currentCount;
      showToast(res.message || 'Failed to update like.', 'error');
    } else {
      // Sync with server response
      likeBtn.dataset.liked = res.data.isLiked ? 'true' : 'false';
      likeBtn.classList.toggle('liked', res.data.isLiked);
      countSpan.textContent = res.data.likesCount;
    }
  });

  // 2. Delete Post
  const deleteBtn = card.querySelector('.btn-delete-post');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this post?')) return;

      const postId = deleteBtn.dataset.postId;
      deleteBtn.disabled = true;

      const res = await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
        deleteBtn.disabled = false;
        showToast(res.message || 'Could not delete post.', 'error');
        return;
      }

      showToast('Post deleted successfully.', 'success');
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      card.style.transition = 'all 0.25s ease';
      setTimeout(() => card.remove(), 250);
    });
  }

  return card;
};
