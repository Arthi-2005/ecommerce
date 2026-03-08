// ===== StockMart - Wishlist JS =====
const API = '';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  const token = localStorage.getItem('token');
  if (!token) {
    document.getElementById('loginRequired').style.display = 'block';
    return;
  }
  document.getElementById('wishlistContent').style.display = 'block';
  loadWishlist();
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

async function loadWishlist() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/wishlist`, { headers: { 'Authorization': `Bearer ${token}` } });
    const items = await res.json();

    if (items.length === 0) {
      document.getElementById('emptyWishlist').style.display = 'block';
      document.getElementById('wishlistCount').textContent = '0 items';
      return;
    }

    document.getElementById('clearBtn').style.display = 'inline-flex';
    document.getElementById('wishlistCount').textContent = `${items.length} item${items.length > 1 ? 's' : ''}`;

    const grid = document.getElementById('wishlistGrid');
    grid.innerHTML = items.map(item => {
      const p = item.product;
      if (!p) return '';
      const changeClass = p.stock_change_percent >= 0 ? 'text-success' : 'text-danger';
      const arrow = p.stock_change_percent >= 0 ? '▲' : '▼';
      return `
        <div class="product-card glass-card fade-in">
          <div class="product-card-top">
            <button class="wishlist-btn hearted" onclick="removeFromWishlist(${p.id}, this)"><i class="fas fa-heart"></i></button>
            <img src="${p.image_url}" alt="${escapeHtml(p.name)}" class="product-image" loading="lazy" onerror="this.src='https://placehold.co/400x400/1a1a3e/6c5ce7?text=P'">
            <div class="product-category">${escapeHtml(p.category)}</div>
          </div>
          <div class="product-info">
            <div class="product-name">${escapeHtml(p.name)}</div>
            <div class="product-price-row">
              <span class="product-price">$${p.price.toFixed(2)}</span>
              <span class="${changeClass}">${arrow} ${Math.abs(p.stock_change_percent).toFixed(2)}%</span>
            </div>
            <div class="product-rating">${renderStars(p.rating)} <span>(${p.reviews})</span></div>
          </div>
          <div class="product-card-actions" style="padding:10px 15px 15px;display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" style="flex:1" onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Add to Cart</button>
            <a href="products.html?id=${p.id}" class="btn btn-secondary btn-sm"><i class="fas fa-eye"></i></a>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {
    console.error('Error loading wishlist:', e);
  }
}

async function removeFromWishlist(productId, btn) {
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API}/api/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId })
    });
    btn.closest('.product-card').style.transform = 'scale(0.8)';
    btn.closest('.product-card').style.opacity = '0';
    setTimeout(() => { btn.closest('.product-card').remove(); updateCount(); }, 300);
    showToast('Removed from wishlist', 'info');
  } catch(e) { showToast('Error', 'error'); }
}

function updateCount() {
  const cards = document.querySelectorAll('#wishlistGrid .product-card');
  document.getElementById('wishlistCount').textContent = `${cards.length} item${cards.length !== 1 ? 's' : ''}`;
  if (cards.length === 0) {
    document.getElementById('emptyWishlist').style.display = 'block';
    document.getElementById('clearBtn').style.display = 'none';
  }
}

async function clearWishlist() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}/api/wishlist`, { headers: { 'Authorization': `Bearer ${token}` } });
  const items = await res.json();
  for (const item of items) {
    await fetch(`${API}/api/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ product_id: item.product_id })
    });
  }
  document.getElementById('wishlistGrid').innerHTML = '';
  document.getElementById('emptyWishlist').style.display = 'block';
  document.getElementById('clearBtn').style.display = 'none';
  document.getElementById('wishlistCount').textContent = '0 items';
  showToast('Wishlist cleared', 'info');
}

async function addToCart(productId) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  try {
    await fetch(`${API}/api/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId, quantity: 1 })
    });
    showToast('Added to cart!', 'success');
    updateCartBadge();
  } catch(e) { showToast('Error', 'error'); }
}

function renderStars(rating) {
  let s = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) s += '<i class="fas fa-star star"></i>';
    else if (i - 0.5 <= rating) s += '<i class="fas fa-star-half-alt star"></i>';
    else s += '<i class="far fa-star star"></i>';
  }
  return s;
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

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text || ''; return d.innerHTML; }
