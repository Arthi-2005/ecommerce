// ===== StockMart - Auth JS =====
const API = '';
let selectedRole = 'user';

// === Role Tab Switching ===
function switchLoginRole(role) {
  selectedRole = role;
  // Update tab active states
  document.getElementById('userTab').classList.toggle('active', role === 'user');
  document.getElementById('adminTab').classList.toggle('active', role === 'admin');

  // Update role info banner
  const icon = document.getElementById('roleInfoIcon');
  const title = document.getElementById('roleInfoTitle');
  const desc = document.getElementById('roleInfoDesc');
  const infoBox = document.getElementById('roleInfo');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnText = document.getElementById('loginBtnText');

  if (role === 'admin') {
    icon.innerHTML = '<i class="fas fa-user-shield"></i>';
    infoBox.className = 'auth-role-info auth-role-info-admin';
    title.textContent = 'Admin Account';
    desc.textContent = 'Manage products, orders, users & analytics';
    loginBtn.className = 'btn btn-login btn-admin-login btn-full btn-glow slide-up';
    loginBtnText.textContent = 'Login as Admin';
  } else {
    icon.innerHTML = '<i class="fas fa-shopping-bag"></i>';
    infoBox.className = 'auth-role-info auth-role-info-user';
    title.textContent = 'User Account';
    desc.textContent = 'Shop products, invest in stocks & track orders';
    loginBtn.className = 'btn btn-login btn-user-login btn-full btn-glow slide-up';
    loginBtnText.textContent = 'Login as User';
  }

  // Clear any errors
  document.getElementById('loginError').classList.remove('show');
  // Clear fields
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginUsername').focus();
}

// Toggle between login and register
function showRegister() {
  document.getElementById('loginCard').style.display = 'none';
  document.getElementById('registerCard').style.display = 'block';
  document.getElementById('registerCard').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('registerCard').style.display = 'none';
  document.getElementById('loginCard').style.display = 'block';
  document.getElementById('loginCard').classList.remove('hidden');
}

// Toggle password visibility
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

// Quick Demo Login
function quickLogin(username, password) {
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = password;
  // Auto-switch role tab
  if (username === 'admin') {
    switchLoginRole('admin');
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
  } else {
    switchLoginRole('user');
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
  }
  // Auto submit
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { cancelable: true }));
}

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  
  errorEl.classList.remove('show');

  if (!username || !password) {
    errorEl.textContent = 'Please enter username and password';
    errorEl.classList.add('show');
    return;
  }
  
  // Show loading state
  const originalHtml = loginBtn.innerHTML;
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed';
      errorEl.classList.add('show');
      loginBtn.disabled = false;
      loginBtn.innerHTML = originalHtml;
      return;
    }

    // Verify the role matches what was selected
    if (selectedRole === 'admin' && data.user.role !== 'admin') {
      errorEl.textContent = 'This is not an admin account. Please use "User Login" tab.';
      errorEl.classList.add('show');
      loginBtn.disabled = false;
      loginBtn.innerHTML = originalHtml;
      return;
    }

    if (selectedRole === 'user' && data.user.role === 'admin') {
      errorEl.textContent = 'This is an admin account. Please use "Admin Login" tab.';
      errorEl.classList.add('show');
      loginBtn.disabled = false;
      loginBtn.innerHTML = originalHtml;
      return;
    }
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Show success briefly
    loginBtn.innerHTML = '<i class="fas fa-check-circle"></i> Success! Redirecting...';
    loginBtn.classList.add('btn-success-state');
    
    // Redirect based on role
    setTimeout(() => {
      if (data.user.role === 'admin') {
        window.location.href = 'dashboard.html';
      } else {
        window.location.href = 'products.html';
      }
    }, 600);
    
  } catch (err) {
    errorEl.textContent = 'Connection error. Is the server running?';
    errorEl.classList.add('show');
    loginBtn.disabled = false;
    loginBtn.innerHTML = originalHtml;
  }
});

// Register
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errorEl = document.getElementById('registerError');
  const regBtn = e.target.querySelector('button[type="submit"]');
  
  errorEl.classList.remove('show');
  
  if (password.length < 4) {
    errorEl.textContent = 'Password must be at least 4 characters';
    errorEl.classList.add('show');
    return;
  }

  const originalHtml = regBtn.innerHTML;
  regBtn.disabled = true;
  regBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
  
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      errorEl.textContent = data.error || 'Registration failed';
      errorEl.classList.add('show');
      regBtn.disabled = false;
      regBtn.innerHTML = originalHtml;
      return;
    }
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    regBtn.innerHTML = '<i class="fas fa-check-circle"></i> Account Created!';
    regBtn.classList.add('btn-success-state');

    setTimeout(() => {
      window.location.href = 'products.html';
    }, 600);
    
  } catch (err) {
    errorEl.textContent = 'Connection error. Is the server running?';
    errorEl.classList.add('show');
    regBtn.disabled = false;
    regBtn.innerHTML = originalHtml;
  }
});

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  fetch(`${API}/api/auth/logout`, { method: 'POST' });
  window.location.href = 'login.html';
}
