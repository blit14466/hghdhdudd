// === Signup Logic ===
document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }

      const user = {
        name: document.getElementById('name').value,
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: password,
        age: document.getElementById('age').value,
        country: document.getElementById('country').value,
        city: document.getElementById('city').value,
        description: document.getElementById('description').value
      };

      try {
        const response = await fetch('/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });

        const data = await response.json();

        if (response.ok) {
          alert('Signup successful! Please log in.');
          window.location.href = '/login.html';
        } else {
          alert(data.message || 'Signup failed.');
        }
      } catch (err) {
        console.error('Error during signup:', err);
        alert('An error occurred during signup.');
      }
    });
  }
});

// === Login Logic ===
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', data.name || data.username);
        window.location.href = '/userdashboard.html';
      } else {
        alert(data.message || 'Login failed.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      alert('An error occurred during login.');
    }
  });
}

// === Auth Check for Protected Pages ===
document.addEventListener('DOMContentLoaded', () => {
  const protectedPages = [
    'userdashboard.html', 'find-penpals.html', 'messages.html', 
    'news-updates.html', 'friends.html', 'profile.html', 
    'settings.html', 'account.html', 'edit-profile.html', 
    'view-profile.html', 'group-chat.html'
  ];

  const currentPage = window.location.pathname.split('/').pop();

  if (protectedPages.includes(currentPage) && localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = '/login.html';
  }

  // Show welcome name if logged in
  const userMenu = document.querySelector('.user-menu');
  if (localStorage.getItem('isLoggedIn') === 'true' && userMenu) {
    const userName = localStorage.getItem('userName');
    userMenu.innerHTML = `
      <span>Welcome, ${userName}</span>
      <a href="#" class="button button-small" id="logoutBtn">Logout</a>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userName');
      window.location.href = '/';
    });
  }
});

// === Global Fetch with CSRF Support ===
async function fetchWithAuth(url, options = {}) {
  options.headers = options.headers || {};
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (csrfToken) {
    options.headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(url, options);

  if (response.status === 401) {
    window.location.href = '/login.html';
    return null;
  }

  return response;
}

// === Notification System ===
class Notifications {
  constructor() {
    this.badge = document.getElementById('notification-badge');
    this.messageCount = document.getElementById('messageNotifications');
    this.friendRequestCount = document.getElementById('friendRequests');
    this.setup();
  }

  async setup() {
    await this.updateCounts();
    setInterval(() => this.updateCounts(), 30000);
  }

  async updateCounts() {
    try {
      const [messagesRes, friendsRes] = await Promise.all([
        fetchWithAuth('/api/messages'),
        fetchWithAuth('/api/friend-requests')
      ]);

      if (messagesRes?.ok && friendsRes?.ok) {
        const messages = await messagesRes.json();
        const friendRequests = await friendsRes.json();

        const unreadMessages = messages.filter(m => !m.isRead).length;
        const pendingRequests = friendRequests.length;

        this.updateBadge(unreadMessages + pendingRequests);
        this.updateMessageCount(unreadMessages);
        this.updateFriendRequestCount(pendingRequests);
      }
    } catch (err) {
      console.error('Error updating notifications:', err);
    }
  }

  updateBadge(count) {
    if (count > 0) {
      this.badge.textContent = count;
      this.badge.style.display = 'inline-block';
    } else {
      this.badge.style.display = 'none';
    }
  }

  updateMessageCount(count) {
    if (count > 0) {
      this.messageCount.textContent = count;
      this.messageCount.style.display = 'inline-block';
    } else {
      this.messageCount.style.display = 'none';
    }
  }

  updateFriendRequestCount(count) {
    if (count > 0) {
      this.friendRequestCount.textContent = count;
      this.friendRequestCount.style.display = 'inline-block';
    } else {
      this.friendRequestCount.style.display = 'none';
    }
  }
}

// Init notifications if elements exist
if (document.getElementById('notification-badge')) {
  new Notifications();
}

// === Theme Switcher ===
function applyTheme(theme) {
  document.body.className = theme === 'dark' ? 'dark-theme' : '';
}

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme || 'light');

// === Form Utilities ===
function serializeForm(form) {
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

// === Image Upload Preview ===
function setupImageUploadPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  if (input && preview) {
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.src = e.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// === Tooltip System ===
function initTooltips() {
  const tooltips = document.querySelectorAll('[data-tooltip]');
  tooltips.forEach(el => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = el.dataset.tooltip;
    document.body.appendChild(tooltip);

    el.addEventListener('mouseenter', (e) => {
      const rect = el.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.bottom + 5}px`;
      tooltip.style.display = 'block';
    });

    el.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
}

// === Init All Components on DOM Load ===
document.addEventListener('DOMContentLoaded', () => {
  initTooltips();
  setupImageUploadPreview('profilePictureInput', 'profilePicturePreview');

  document.querySelectorAll('form[data-form="ajax"]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = serializeForm(form);
      const action = form.getAttribute('action') || window.location.pathname;
      const method = form.getAttribute('method') || 'POST';

      try {
        const response = await fetchWithAuth(action, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (response?.ok) {
          const result = await response.json();
          if (form.dataset.redirect) {
            window.location.href = form.dataset.redirect;
          } else {
            alert('Operation completed successfully!');
          }
        } else {
          const error = await response.text();
          alert(error || 'An error occurred');
        }
      } catch (err) {
        console.error('Error submitting form:', err);
        alert('An error occurred while submitting the form');
      }
    });
  });
});