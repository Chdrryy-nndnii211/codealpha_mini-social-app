// =========================================================
// Single Post & Comments Page Logic
// =========================================================

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  renderNavbar();

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) {
    showToast('Post ID missing.', 'error');
    window.location.href = 'feed.html';
    return;
  }

  const currentUser = getUser();
  const postLoader = document.getElementById('post-loader');
  const singlePostContainer = document.getElementById('single-post-container');
  const commentsSection = document.getElementById('comments-section');
  const commentsList = document.getElementById('comments-list');
  const commentCountBadge = document.getElementById('comment-count-badge');
  const addCommentForm = document.getElementById('add-comment-form');
  const commentInput = document.getElementById('comment-input');
  const submitCommentBtn = document.getElementById('submit-comment-btn');

  let currentPost = null;

  // Load post & comments
  const loadPost = async () => {
    const res = await apiFetch(`/posts/${postId}`);
    postLoader.style.display = 'none';

    if (!res.ok) {
      singlePostContainer.style.display = 'block';
      singlePostContainer.innerHTML = `
        <div class="empty-state">
          <h3>Post Not Found</h3>
          <p>${escapeHtml(res.message)}</p>
          <a href="feed.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Back to Feed</a>
        </div>
      `;
      return;
    }

    currentPost = res.data.post;
    renderPost(currentPost);
    renderComments(currentPost.comments || []);

    singlePostContainer.style.display = 'block';
    commentsSection.style.display = 'block';
  };

  const renderPost = (post) => {
    singlePostContainer.innerHTML = '';

    const author = post.user || {};
    const authorName = author.username || 'User';
    const authorAvatar = author.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorName}`;
    const authorId = author._id || author.id;
    const timeFormatted = formatRelativeTime(post.createdAt);
    const isAuthor = currentUser && authorId && (currentUser.id === authorId || currentUser._id === authorId);

    let imageHtml = '';
    if (post.image && post.image.trim()) {
      imageHtml = `
        <div class="post-image-container">
          <img src="${escapeHtml(post.image)}" alt="Post image" class="post-image" onerror="this.parentElement.style.display='none';">
        </div>
      `;
    }

    let deleteBtnHtml = '';
    if (isAuthor) {
      deleteBtnHtml = `
        <button class="btn-icon btn-delete-post" title="Delete post">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    }

    const card = document.createElement('article');
    card.className = 'post-card';
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

      <div class="post-content" style="font-size: 1.05rem;">${escapeHtml(post.content)}</div>
      ${imageHtml}

      <footer class="post-actions">
        <button class="action-btn btn-like ${post.isLiked ? 'liked' : ''}" data-liked="${post.isLiked}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
          </svg>
          <span class="like-count">${post.likesCount}</span>
        </button>
        <span class="action-btn" style="cursor: default;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span id="post-actions-comment-count">${post.commentsCount}</span>
        </span>
      </footer>
    `;

    // Like Toggle
    const likeBtn = card.querySelector('.btn-like');
    likeBtn.addEventListener('click', async () => {
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
        showToast(res.message || 'Failed to toggle like.', 'error');
      } else {
        likeBtn.dataset.liked = res.data.isLiked ? 'true' : 'false';
        likeBtn.classList.toggle('liked', res.data.isLiked);
        countSpan.textContent = res.data.likesCount;
      }
    });

    // Delete Post
    const deleteBtn = card.querySelector('.btn-delete-post');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        const res = await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
        if (!res.ok) {
          showToast(res.message || 'Could not delete post.', 'error');
          return;
        }
        showToast('Post deleted.', 'success');
        window.location.href = 'feed.html';
      });
    }

    singlePostContainer.appendChild(card);
  };

  const renderComments = (comments) => {
    commentsList.innerHTML = '';
    commentCountBadge.textContent = comments.length;
    const postActionsCount = document.getElementById('post-actions-comment-count');
    if (postActionsCount) postActionsCount.textContent = comments.length;

    if (comments.length === 0) {
      commentsList.innerHTML = `
        <div id="no-comments-msg" style="text-align: center; color: var(--text-muted); padding: 1.5rem 0; font-size: 0.9rem;">
          No comments yet. Be the first to join the conversation!
        </div>
      `;
      return;
    }

    comments.forEach((comment) => {
      const commentEl = createCommentElement(comment);
      commentsList.appendChild(commentEl);
    });
  };

  const createCommentElement = (comment) => {
    const el = document.createElement('div');
    el.className = 'comment-item';
    el.id = `comment-${comment._id}`;

    const author = comment.user || {};
    const authorName = author.username || 'User';
    const authorAvatar = author.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorName}`;
    const authorId = author._id || author.id;
    const isOwnComment = currentUser && authorId && (currentUser.id === authorId || currentUser._id === authorId);

    let deleteCommentBtnHtml = '';
    if (isOwnComment) {
      deleteCommentBtnHtml = `
        <button class="btn-icon btn-delete-comment" title="Delete comment" style="padding: 2px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    }

    el.innerHTML = `
      <a href="profile.html?id=${authorId}">
        <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="comment-avatar">
      </a>
      <div class="comment-body">
        <div class="comment-meta">
          <div>
            <a href="profile.html?id=${authorId}" class="comment-author">@${escapeHtml(authorName)}</a>
            <span class="comment-time">&bull; ${formatRelativeTime(comment.createdAt)}</span>
          </div>
          ${deleteCommentBtnHtml}
        </div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
      </div>
    `;

    // Delete comment event
    const deleteBtn = el.querySelector('.btn-delete-comment');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this comment?')) return;
        const res = await apiFetch(`/comments/${comment._id}`, { method: 'DELETE' });
        if (!res.ok) {
          showToast(res.message || 'Could not delete comment.', 'error');
          return;
        }

        showToast('Comment deleted.', 'success');
        el.remove();

        const currentCount = Math.max(0, (parseInt(commentCountBadge.textContent, 10) || 1) - 1);
        commentCountBadge.textContent = currentCount;
        const postActionsCount = document.getElementById('post-actions-comment-count');
        if (postActionsCount) postActionsCount.textContent = currentCount;

        if (currentCount === 0) {
          commentsList.innerHTML = `
            <div id="no-comments-msg" style="text-align: center; color: var(--text-muted); padding: 1.5rem 0; font-size: 0.9rem;">
              No comments yet. Be the first to join the conversation!
            </div>
          `;
        }
      });
    }

    return el;
  };

  // Add Comment Form Submit
  addCommentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = commentInput.value.trim();
    if (!text) {
      showToast('Comment cannot be empty.', 'error');
      commentInput.focus();
      return;
    }

    const originalBtn = submitCommentBtn.innerHTML;
    submitCommentBtn.disabled = true;
    submitCommentBtn.innerHTML = `<div class="spinner" style="width: 14px; height: 14px;"></div>`;

    const res = await apiFetch(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    submitCommentBtn.disabled = false;
    submitCommentBtn.innerHTML = originalBtn;

    if (!res.ok) {
      showToast(res.message || 'Failed to add comment.', 'error');
      return;
    }

    commentInput.value = '';
    showToast('Comment added!', 'success');

    // Remove no-comments message if present
    const noCommentsMsg = document.getElementById('no-comments-msg');
    if (noCommentsMsg) noCommentsMsg.remove();

    // Append comment
    const newCommentEl = createCommentElement(res.data.comment);
    commentsList.appendChild(newCommentEl);

    // Update count
    const currentCount = (parseInt(commentCountBadge.textContent, 10) || 0) + 1;
    commentCountBadge.textContent = currentCount;
    const postActionsCount = document.getElementById('post-actions-comment-count');
    if (postActionsCount) postActionsCount.textContent = currentCount;
  });

  await loadPost();
});
