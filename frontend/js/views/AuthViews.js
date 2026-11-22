// public/js/views/AuthViews.js - User Authentication (Login & Register)

window.AuthViews = {
  // Login Form View
  Login: {
    async render() {
      return `
        <div class="container" style="padding-top:40px; padding-bottom:60px; max-width:420px;">
          <div class="card" style="padding:28px;">
            <div style="text-align:center; margin-bottom:20px;">
              <h2 style="font-size:20px; font-weight:800; margin-bottom:4px;">Sign In to CivicSync</h2>
              <p style="font-size:12px; color:var(--color-text-secondary);">Access citizen tracking or administrator controls</p>
            </div>

            <!-- Quick Demo Credentials for Viva Presentation -->
            <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:4px; padding:10px; margin-bottom:16px; font-size:11px;">
              <div style="font-weight:700; color:#1E3A8A; margin-bottom:6px;">Demo Quick-Fill:</div>
              <div style="display:flex; gap:6px;">
                <button type="button" id="btn-fill-citizen" class="btn btn-secondary btn-sm" style="flex:1;">Fill Citizen</button>
                <button type="button" id="btn-fill-admin" class="btn btn-secondary btn-sm" style="flex:1;">Fill Admin</button>
              </div>
            </div>

            <form id="auth-login-form">
              <div class="form-group">
                <label class="form-label" for="login-email">Email Address</label>
                <input type="email" id="login-email" class="form-input" placeholder="user@civicsync.local" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="login-password">Password</label>
                <input type="password" id="login-password" class="form-input" placeholder="••••••••" required />
              </div>

              <button type="submit" id="btn-submit-login" class="btn btn-primary" style="width:100%; margin-top:8px;">Sign In</button>
            </form>

            <div style="text-align:center; margin-top:16px; font-size:12px; color:var(--color-text-secondary);">
              Need a citizen account? <a href="#/register" style="color:var(--color-accent-primary); font-weight:600;">Register here</a>
            </div>
          </div>
        </div>
      `;
    },

    async afterMount() {
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');

      // Quick autofill buttons for viva demo
      document.getElementById('btn-fill-citizen')?.addEventListener('click', () => {
        emailInput.value = 'citizen@civicsync.local';
        passInput.value = 'Citizen#Secure2026!';
      });

      document.getElementById('btn-fill-admin')?.addEventListener('click', () => {
        emailInput.value = 'admin@civicsync.local';
        passInput.value = 'Admin#Secure2026!';
      });

      // Submit login
      document.getElementById('auth-login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-login');
        btn.disabled = true;
        btn.textContent = 'Authenticating...';

        try {
          const res = await window.api.post('/auth/login', {
            email: emailInput.value,
            password: passInput.value
          });

          if (res.success) {
            window.api.setSession(res.data.token, res.data.user);
            window.Navbar.render();
            if (res.data.user.role === 'admin') {
              window.location.hash = '#/admin';
            } else {
              window.location.hash = '#/explore';
            }
          } else {
            alert(res.message || 'Login failed');
            btn.disabled = false;
            btn.textContent = 'Sign In';
          }
        } catch (err) {
          alert('Network error: ' + err.message);
          btn.disabled = false;
          btn.textContent = 'Sign In';
        }
      });
    }
  },

  // Citizen Registration Form View
  Register: {
    async render() {
      return `
        <div class="container" style="padding-top:40px; padding-bottom:60px; max-width:420px;">
          <div class="card" style="padding:28px;">
            <div style="text-align:center; margin-bottom:20px;">
              <h2 style="font-size:20px; font-weight:800; margin-bottom:4px;">Create Citizen Account</h2>
              <p style="font-size:12px; color:var(--color-text-secondary);">Register to file and track civic issues in Sonipat</p>
            </div>

            <form id="auth-register-form">
              <div class="form-group">
                <label class="form-label" for="reg-name">Full Name *</label>
                <input type="text" id="reg-name" class="form-input" placeholder="e.g. Rahul Sharma" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="reg-email">Email Address *</label>
                <input type="email" id="reg-email" class="form-input" placeholder="e.g. rahul@example.com" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="reg-password">Password (min 6 chars) *</label>
                <input type="password" id="reg-password" class="form-input" minlength="6" placeholder="••••••••" required />
              </div>

              <button type="submit" id="btn-submit-reg" class="btn btn-primary" style="width:100%; margin-top:8px;">Register Account</button>
            </form>

            <div style="text-align:center; margin-top:16px; font-size:12px; color:var(--color-text-secondary);">
              Already have an account? <a href="#/login" style="color:var(--color-accent-primary); font-weight:600;">Sign in here</a>
            </div>
          </div>
        </div>
      `;
    },

    async afterMount() {
      document.getElementById('auth-register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-reg');
        btn.disabled = true;
        btn.textContent = 'Creating account...';

        try {
          const res = await window.api.post('/auth/register', {
            full_name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value
          });

          if (res.success) {
            window.api.setSession(res.data.token, res.data.user);
            window.Navbar.render();
            alert('Registration successful! Welcome to CivicSync.');
            window.location.hash = '#/explore';
          } else {
            alert(res.message || 'Registration failed');
            btn.disabled = false;
            btn.textContent = 'Register Account';
          }
        } catch (err) {
          alert('Error: ' + err.message);
          btn.disabled = false;
          btn.textContent = 'Register Account';
        }
      });
    }
  }
};
