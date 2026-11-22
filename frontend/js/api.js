// public/js/api.js - Simple HTTP Client & Session Storage Helper

window.api = {
  // Retrieve saved JWT token from localStorage
  getToken() {
    return localStorage.getItem('civicsync_token');
  },

  // Retrieve saved user object from localStorage
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('civicsync_user'));
    } catch (e) {
      return null;
    }
  },

  // Save authentication token and user info
  setSession(token, user) {
    if (user) {
      user.role = (user.role || '').toLowerCase();
      user.full_name = user.full_name || user.fullName;
    }
    localStorage.setItem('civicsync_token', token);
    localStorage.setItem('civicsync_user', JSON.stringify(user));
  },

  // Clear authentication token and log out
  clearSession() {
    localStorage.removeItem('civicsync_token');
    localStorage.removeItem('civicsync_user');
  },

  // Check if current user is an authenticated administrator
  isAdmin() {
    const user = this.getUser();
    return !!(user && (user.role === 'admin' || user.role === 'ADMIN'));
  },

  // Internal helper to parse responses and handle expired tokens
  async handleResponse(res) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      this.clearSession();
      if (window.Navbar) window.Navbar.render();
    }
    return data;
  },

  // Perform GET request with optional query parameters
  async get(endpoint, query = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.append(key, value);
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api${endpoint}${queryString}`, {
      headers: {
        'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : ''
      }
    });
    return this.handleResponse(res);
  },

  // Perform JSON POST request
  async post(endpoint, data = {}) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : ''
      },
      body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  },

  // Perform Multipart/Form-Data POST request (for image file upload)
  async postForm(endpoint, formData) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : ''
      },
      body: formData
    });
    return this.handleResponse(res);
  },

  // Perform JSON PATCH request
  async patch(endpoint, data = {}) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : ''
      },
      body: JSON.stringify(data)
    });
    return this.handleResponse(res);
  },

  // Utility to safely escape user inputs for HTML rendering
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
