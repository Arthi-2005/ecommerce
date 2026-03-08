// ===== StockMart - Profile JS =====
const API = '';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('profileContent').style.display = 'block';
  loadProfile();
  loadNotifications();
  document.getElementById('profileForm').addEventListener('submit', saveProfile);
  document.getElementById('passwordForm').addEventListener('submit', changePassword);
  document.getElementById('addressForm').addEventListener('submit', saveAddress);
});

function initNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); mobileMenu.classList.toggle('show'); });
  }
  checkAuth();
  updateCartBadge();
}

function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const loginBtn = document.getElementById('loginBtn');
  if (token && user && loginBtn) {
    const wrapper = document.createElement('div');
    wrapper.className = 'nav-user-dropdown';
    wrapper.innerHTML = `
      <button class="nav-user-btn" type="button">
        <i class="fas fa-user-circle"></i>
        <span class="nav-username">${escapeHtml(user.username)}</span>
        <span class="nav-role-badge nav-role-${user.role}">${user.role === 'admin' ? 'Admin' : 'User'}</span>
        <i class="fas fa-chevron-down nav-dd-arrow"></i>
      </button>
      <div class="nav-dropdown-menu" id="userDropdownMenu">
        <div class="nav-dd-header">
          <i class="fas fa-user-circle"></i>
          <div>
            <div class="nav-dd-name">${escapeHtml(user.username)}</div>
            <div class="nav-dd-role">${user.role === 'admin' ? 'Administrator' : 'Customer'}</div>
          </div>
        </div>
        <div class="nav-dd-divider"></div>
        ${user.role === 'admin' ? '<a href="dashboard.html" class="nav-dd-item"><i class="fas fa-tachometer-alt"></i> Dashboard</a>' : ''}
        <a href="profile.html" class="nav-dd-item"><i class="fas fa-user-edit"></i> My Profile</a>
        <a href="orders.html" class="nav-dd-item"><i class="fas fa-receipt"></i> My Orders</a>
        <a href="wishlist.html" class="nav-dd-item"><i class="fas fa-heart"></i> Wishlist</a>
        <a href="cart.html" class="nav-dd-item"><i class="fas fa-shopping-cart"></i> My Cart</a>
        <div class="nav-dd-divider"></div>
        <a href="#" class="nav-dd-item nav-dd-logout" onclick="event.preventDefault();logout()"><i class="fas fa-sign-out-alt"></i> Logout</a>
      </div>
    `;
    loginBtn.replaceWith(wrapper);
    wrapper.querySelector('.nav-user-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      wrapper.classList.toggle('open');
      document.getElementById('userDropdownMenu').classList.toggle('show');
    });
    document.addEventListener('click', () => {
      wrapper.classList.remove('open');
      document.getElementById('userDropdownMenu')?.classList.remove('show');
    });
  }
}

function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = 'login.html'; }

async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const token = localStorage.getItem('token');
  if (!badge || !token) return;
  try {
    const res = await fetch(`${API}/api/cart/count`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    badge.textContent = data.count || 0;
    badge.style.display = data.count > 0 ? 'inline-flex' : 'none';
  } catch(e) {}
}

// === Load Profile ===
async function loadProfile() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();

    document.getElementById('profUsername').value = data.username;
    document.getElementById('profEmail').value = data.email;
    document.getElementById('profRole').value = data.role === 'admin' ? 'Administrator' : 'Customer';
    document.getElementById('profSince').value = new Date(data.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('statOrders').textContent = data.stats.orders;
    document.getElementById('statWishlist').textContent = data.stats.wishlist;
    document.getElementById('statReviews').textContent = data.stats.reviews;

    renderAddresses(data.addresses || []);
  } catch(e) {
    showToast('Error loading profile', 'error');
  }
}

// === Save Profile ===
async function saveProfile(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const username = document.getElementById('profUsername').value.trim();
  const email = document.getElementById('profEmail').value.trim();
  if (!username || !email) { showToast('Fill all fields', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ username, email })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    // Update local storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.username = username;
    user.email = email;
    localStorage.setItem('user', JSON.stringify(user));
    showToast('Profile updated!', 'success');
  } catch(e) { showToast('Error saving', 'error'); }
}

// === Change Password ===
async function changePassword(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
  if (newPassword.length < 4) { showToast('Password must be at least 4 characters', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/profile/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast('Password changed!', 'success');
    document.getElementById('passwordForm').reset();
  } catch(e) { showToast('Error', 'error'); }
}

// === Addresses ===
function renderAddresses(addresses) {
  const el = document.getElementById('addressesList');
  if (addresses.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim)"><i class="fas fa-map-marker-alt" style="font-size:2rem;margin-bottom:10px;opacity:0.5"></i><p>No saved addresses</p></div>';
    return;
  }
  el.innerHTML = addresses.map(a => `
    <div class="address-card" style="display:flex;justify-content:space-between;align-items:flex-start;padding:15px;margin-bottom:10px;background:rgba(108,92,231,0.05);border-radius:12px;border:1px solid var(--glass-border)">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-weight:700;font-size:0.95rem">${escapeHtml(a.label || 'Home')}</span>
          ${a.isDefault ? '<span style="background:rgba(108,92,231,0.2);color:var(--primary-light);padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600">DEFAULT</span>' : ''}
        </div>
        <div style="font-weight:600">${escapeHtml(a.fullName)}</div>
        <div style="color:var(--text-dim);font-size:0.85rem;margin-top:2px">${escapeHtml(a.address)}</div>
        <div style="color:var(--text-dim);font-size:0.85rem">${escapeHtml(a.city)}, ${escapeHtml(a.state)} - ${escapeHtml(a.pincode)}</div>
        <div style="color:var(--text-dim);font-size:0.85rem"><i class="fas fa-phone"></i> ${escapeHtml(a.phone)}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-sm" onclick='editAddress(${JSON.stringify(a).replace(/'/g, "&#39;")})'><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteAddress(${a.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function showAddressForm() {
  document.getElementById('addressFormSection').style.display = 'block';
  document.getElementById('addressFormTitle').innerHTML = '<i class="fas fa-plus"></i> Add New Address';
  document.getElementById('addressForm').reset();
  document.getElementById('addrEditId').value = '';
  document.getElementById('addressFormSection').scrollIntoView({ behavior: 'smooth' });
}

function hideAddressForm() {
  document.getElementById('addressFormSection').style.display = 'none';
}

function editAddress(addr) {
  document.getElementById('addressFormSection').style.display = 'block';
  document.getElementById('addressFormTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Address';
  document.getElementById('addrEditId').value = addr.id;
  document.getElementById('addrLabel').value = addr.label || 'Home';
  document.getElementById('addrName').value = addr.fullName;
  document.getElementById('addrPhone').value = addr.phone;
  document.getElementById('addrAddress').value = addr.address;
  document.getElementById('addrCity').value = addr.city;
  document.getElementById('addrState').value = addr.state;
  document.getElementById('addrPincode').value = addr.pincode;
  document.getElementById('addrDefault').checked = addr.isDefault;
  document.getElementById('addressFormSection').scrollIntoView({ behavior: 'smooth' });
}

async function saveAddress(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const editId = document.getElementById('addrEditId').value;
  const body = {
    label: document.getElementById('addrLabel').value,
    fullName: document.getElementById('addrName').value.trim(),
    phone: document.getElementById('addrPhone').value.trim(),
    address: document.getElementById('addrAddress').value.trim(),
    city: document.getElementById('addrCity').value.trim(),
    state: document.getElementById('addrState').value.trim(),
    pincode: document.getElementById('addrPincode').value.trim(),
    isDefault: document.getElementById('addrDefault').checked
  };

  const url = editId ? `${API}/api/profile/address/${editId}` : `${API}/api/profile/address`;
  const method = editId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast(editId ? 'Address updated!' : 'Address added!', 'success');
    hideAddressForm();
    loadProfile();
  } catch(e) { showToast('Error saving address', 'error'); }
}

async function deleteAddress(id) {
  if (!confirm('Delete this address?')) return;
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API}/api/profile/address/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    showToast('Address deleted', 'info');
    loadProfile();
  } catch(e) { showToast('Error', 'error'); }
}

// === Notifications ===
async function loadNotifications() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/notifications`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const { notifications, unreadCount } = data;

    const badge = document.getElementById('notifBadge');
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-flex';
    }

    const el = document.getElementById('notificationsList');
    if (notifications.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim)"><i class="fas fa-bell-slash" style="font-size:2rem;margin-bottom:10px;opacity:0.5"></i><p>No notifications yet</p></div>';
      return;
    }

    el.innerHTML = notifications.map(n => {
      const icons = {
        order_confirmed: 'fa-check-circle text-success',
        order_shipped: 'fa-shipping-fast',
        order_delivered: 'fa-box-open text-success',
        order_cancelled: 'fa-times-circle text-danger',
        order_processing: 'fa-cog fa-spin'
      };
      const icon = icons[n.type] || 'fa-bell';
      const time = timeAgo(n.created_at);
      return `
        <div class="notif-item ${n.read ? '' : 'notif-unread'}" style="display:flex;align-items:flex-start;gap:12px;padding:12px;margin-bottom:8px;border-radius:10px;background:${n.read ? 'transparent' : 'rgba(108,92,231,0.08)'};border:1px solid ${n.read ? 'transparent' : 'var(--glass-border)'}">
          <i class="fas ${icon}" style="font-size:1.2rem;margin-top:2px;width:24px;text-align:center;color:var(--primary-light)"></i>
          <div style="flex:1">
            <div style="font-weight:${n.read ? '400' : '600'};font-size:0.9rem">${escapeHtml(n.message)}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px">${time}</div>
          </div>
          <div style="display:flex;gap:6px">
            ${!n.read ? `<button class="btn btn-secondary btn-sm" onclick="markRead(${n.id})" title="Mark read"><i class="fas fa-check"></i></button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="deleteNotif(${n.id})" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) { console.error('Error loading notifications:', e); }
}

async function markRead(id) {
  const token = localStorage.getItem('token');
  await fetch(`${API}/api/notifications/${id}/read`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
  loadNotifications();
}

async function markAllRead() {
  const token = localStorage.getItem('token');
  await fetch(`${API}/api/notifications/read-all`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
  showToast('All marked as read', 'success');
  loadNotifications();
}

async function deleteNotif(id) {
  const token = localStorage.getItem('token');
  await fetch(`${API}/api/notifications/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  loadNotifications();
}

function timeAgo(dateStr) {
  const now = new Date();
  const past = new Date(dateStr);
  const diff = Math.floor((now - past) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// === Utilities ===
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-enter`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => { toast.classList.remove('toast-show'); toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 400); }, 3500);
}
