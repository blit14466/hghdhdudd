// Handle form submissions
document.addEventListener('DOMContentLoaded', function() {
  // Signup form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form values
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      // Validate passwords match
      if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }
      
      // Store user data in localStorage (for demo purposes)
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
      
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Redirect to login page
      window.location.href = '/login.html';
    });
  }
  
  
          
 // Check login state on page load
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userMenu = document.querySelector('.user-menu');
  
  if (isLoggedIn && userMenu) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    userMenu.innerHTML = `
      <span>Welcome, ${user.name}</span>
      <a href="#" class="button button-small" id="logoutBtn">Logout</a>
    `;
    
    document.getElementById('logoutBtn').addEventListener('click', function() {
      localStorage.removeItem('isLoggedIn');
      window.location.href = '/';
    });
  }
  
  // Simple auth check for protected pages
  if (window.location.pathname === '/userdashboard.html' && !isLoggedIn) {
    window.location.href = '/login.html';
  }
  
  // Global helper functions
async function fetchWithAuth(url, options = {}) {
  if (!options.headers) {
    options.headers = {};
  }
  
  // Add CSRF token if needed
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  if (csrfToken) {
    options.headers['X-CSRF-Token'] = csrfToken;
  }
  
  const response = await fetch(url, options);
  
  if (response.status === 401) {
    // Unauthorized - redirect to login
    window.location.href = '/login.html';
    return null;
  }
  
  return response;
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
  // For protected pages, verify the user is logged in
  const protectedPages = [
    'userdashboard.html', 
    'find-penpals.html',
    'messages.html',
    'news-updates.html',
    'friends.html',
    'profile.html',
    'settings.html',
    'account.html',
    'edit-profile.html',
    'view-profile.html',
    'group-chat.html'
  ];
  
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage)) {
    try {
      const response = await fetch('/api/user');
      if (!response.ok) {
        window.location.href = '/login.html';
      }
    } catch (err) {
      console.error('Error checking auth:', err);
      window.location.href = '/login.html';
    }
  }
});

// Notification system
class Notifications {
  constructor() {
    this.badge = document.getElementById('notification-badge');
    this.messageCount = document.getElementById('messageNotifications');
    this.friendRequestCount = document.getElementById('friendRequests');
    this.setup();
  }
  
  async setup() {
    await this.updateCounts();
    setInterval(() => this.updateCounts(), 30000); // Update every 30 seconds
  }
  
  async updateCounts() {
    try {
      const [messagesRes, friendsRes] = await Promise.all([
        fetch('/api/messages'),
        fetch('/api/friend-requests')
      ]);
      
      if (messagesRes.ok && friendsRes.ok) {
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

// Initialize notifications if elements exist
if (document.getElementById('notification-badge')) {
  const notifications = new Notifications();
}

// Theme switcher
function applyTheme(theme) {
  document.body.className = theme === 'dark' ? 'dark-theme' : '';
}

// Check for saved theme preference
if (localStorage.getItem('theme')) {
  applyTheme(localStorage.getItem('theme'));
} else {
  // Default to light theme
  applyTheme('light');
}

// Form handling utilities
function serializeForm(form) {
  const formData = new FormData(form);
  const data = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  return data;
}

// Image upload preview
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

// Initialize tooltips
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

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initTooltips();
  
  // Set up all image upload previews
  setupImageUploadPreview('profilePictureInput', 'profilePicturePreview');
  
  // Set up all forms with data-form="ajax" attribute
  document.querySelectorAll('form[data-form="ajax"]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = serializeForm(form);
      const action = form.getAttribute('action') || window.location.pathname;
      const method = form.getAttribute('method') || 'POST';
      
      try {
        const response = await fetchWithAuth(action, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
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
});