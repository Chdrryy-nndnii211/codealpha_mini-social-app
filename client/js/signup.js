// =========================================================
// Signup Page Logic
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  if (redirectIfAuth()) return;

  const form = document.getElementById('signup-form');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const bioInput = document.getElementById('bio');
  const profilePictureInput = document.getElementById('profilePicture');
  const signupBtn = document.getElementById('signup-btn');

  const usernameError = document.getElementById('username-error');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  const clearErrors = () => {
    usernameError.style.display = 'none';
    usernameError.textContent = '';
    emailError.style.display = 'none';
    emailError.textContent = '';
    passwordError.style.display = 'none';
    passwordError.textContent = '';
  };

  const showError = (element, message) => {
    element.textContent = message;
    element.style.display = 'block';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const bio = bioInput.value.trim();
    const profilePicture = profilePictureInput.value.trim();

    let hasError = false;

    if (!username) {
      showError(usernameError, 'Username is required.');
      hasError = true;
    } else if (username.length < 3) {
      showError(usernameError, 'Username must be at least 3 characters.');
      hasError = true;
    }

    if (!email) {
      showError(emailError, 'Email address is required.');
      hasError = true;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      showError(emailError, 'Please enter a valid email address.');
      hasError = true;
    }

    if (!password) {
      showError(passwordError, 'Password is required.');
      hasError = true;
    } else if (password.length < 6) {
      showError(passwordError, 'Password must be at least 6 characters.');
      hasError = true;
    }

    if (hasError) return;

    // Loading state
    const originalBtnContent = signupBtn.innerHTML;
    signupBtn.disabled = true;
    signupBtn.innerHTML = `<div class="spinner" style="width: 18px; height: 18px;"></div> Creating account...`;

    const res = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        bio,
        profilePicture: profilePicture || undefined,
      }),
    });

    signupBtn.disabled = false;
    signupBtn.innerHTML = originalBtnContent;

    if (!res.ok) {
      showToast(res.message || 'Registration failed.', 'error');
      if (res.message && res.message.toLowerCase().includes('email')) {
        showError(emailError, res.message);
      } else if (res.message && res.message.toLowerCase().includes('username')) {
        showError(usernameError, res.message);
      } else {
        showError(passwordError, res.message);
      }
      return;
    }

    // Automatically store token & login
    setToken(res.data.token);
    setUser(res.data.user);
    showToast('Account created successfully! Welcome!', 'success');

    setTimeout(() => {
      window.location.href = 'feed.html';
    }, 600);
  });
});
