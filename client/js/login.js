// =========================================================
// Login Page Logic
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to feed
  if (redirectIfAuth()) return;

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  const clearErrors = () => {
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

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

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
    }

    if (hasError) return;

    // Set loading state
    const originalBtnContent = loginBtn.innerHTML;
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<div class="spinner" style="width: 18px; height: 18px;"></div> Logging in...`;

    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    loginBtn.disabled = false;
    loginBtn.innerHTML = originalBtnContent;

    if (!res.ok) {
      showToast(res.message || 'Login failed. Please check credentials.', 'error');
      if (res.message && res.message.toLowerCase().includes('password')) {
        showError(passwordError, res.message);
      } else {
        showError(emailError, res.message);
      }
      return;
    }

    // Success
    setToken(res.data.token);
    setUser(res.data.user);
    showToast('Login successful! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'feed.html';
    }, 600);
  });
});
