// ===== StockMart - Compare JS =====
const API = '';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  loadCompare();
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

async function loadCompare() {
  const ids = JSON.parse(localStorage.getItem('compareList') || '[]');
  if (ids.length === 0) {
    document.getElementById('emptyCompare').style.display = 'block';
    document.getElementById('compareActions').style.display = 'none';
    document.getElementById('compareSection').style.display = 'none';
    return;
  }

  document.getElementById('emptyCompare').style.display = 'none';
  document.getElementById('compareActions').style.display = 'flex';
  document.getElementById('compareSection').style.display = 'block';

  // Fetch all products
  const products = [];
  for (const id of ids) {
    try {
      const res = await fetch(`${API}/api/products/${id}`);
      if (res.ok) products.push(await res.json());
    } catch(e) {}
  }

  if (products.length === 0) {
    document.getElementById('emptyCompare').style.display = 'block';
    document.getElementById('compareSection').style.display = 'none';
    return;
  }

  renderCompareTable(products);
}

function renderCompareTable(products) {
  const table = document.getElementById('compareTable');
  const labelStyle = 'padding:12px 15px;font-weight:600;color:var(--text-dim);font-size:0.85rem;text-align:left;white-space:nowrap;border-bottom:1px solid var(--glass-border);background:rgba(108,92,231,0.04)';
  const cellStyle = 'padding:12px 15px;text-align:center;border-bottom:1px solid var(--glass-border);font-size:0.9rem';

  const rows = [
    {
      label: '',
      render: p => `
        <div style="text-align:center;padding:10px">
          <img src="${p.image_url}" style="width:100px;height:100px;border-radius:12px;object-fit:cover;margin-bottom:8px" onerror="this.src='https://placehold.co/100/1a1a3e/6c5ce7?text=P'">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:3px">${escapeHtml(p.name)}</div>
          <div style="font-size:0.8rem;color:var(--text-dim)">${escapeHtml(p.category)}</div>
          <button class="btn btn-danger btn-sm" style="margin-top:8px;font-size:0.7rem" onclick="removeCompare(${p.id})"><i class="fas fa-times"></i> Remove</button>
        </div>`
    },
    { label: 'Price', render: p => `<span style="font-size:1.2rem;font-weight:800;color:var(--primary-light)">$${p.price.toFixed(2)}</span>` },
    { label: 'Rating', render: p => `${renderStars(p.rating)} <span style="color:var(--text-dim)">${p.rating.toFixed(1)}</span>` },
    { label: 'Reviews', render: p => `${p.reviews.toLocaleString()}` },
    { label: 'Stock Price', render: p => `$${p.stock_price.toFixed(2)}` },
    {
      label: 'Change %',
      render: p => {
        const cls = p.stock_change_percent >= 0 ? 'text-success' : 'text-danger';
        const arrow = p.stock_change_percent >= 0 ? '▲' : '▼';
        return `<span class="${cls}" style="font-weight:700">${arrow} ${Math.abs(p.stock_change_percent).toFixed(2)}%</span>`;
      }
    },
    { label: 'Market Cap', render: p => formatCurrency(p.market_cap) },
    { label: 'P/E Ratio', render: p => p.pe_ratio.toFixed(2) },
    { label: 'Volume', render: p => formatNumber(p.volume) },
    { label: '52W High', render: p => `<span class="text-success">$${p.high_52w.toFixed(2)}</span>` },
    { label: '52W Low', render: p => `<span class="text-danger">$${p.low_52w.toFixed(2)}</span>` },
    { label: 'In Stock', render: p => p.in_stock ? '<span class="text-success"><i class="fas fa-check-circle"></i> Yes</span>' : '<span class="text-danger"><i class="fas fa-times-circle"></i> No</span>' },
    {
      label: 'Action',
      render: p => `<button class="btn btn-primary btn-sm" onclick="addToCartCompare(${p.id})"><i class="fas fa-cart-plus"></i> Add to Cart</button>`
    }
  ];

  // Highlight best values
  const bestPrice = Math.min(...products.map(p => p.price));
  const bestRating = Math.max(...products.map(p => p.rating));
  const bestChange = Math.max(...products.map(p => p.stock_change_percent));

  table.innerHTML = rows.map((row, rowIdx) => {
    const tds = products.map(p => `<td style="${cellStyle}">${row.render(p)}</td>`).join('');
    return `<tr><td style="${labelStyle}">${row.label}</td>${tds}</tr>`;
  }).join('');
}

function removeCompare(productId) {
  let list = JSON.parse(localStorage.getItem('compareList') || '[]');
  list = list.filter(id => id !== productId);
  localStorage.setItem('compareList', JSON.stringify(list));
  loadCompare();
  showToast('Removed from comparison', 'info');
}

function clearCompare() {
  localStorage.removeItem('compareList');
  loadCompare();
  showToast('Comparison cleared', 'info');
}

async function addToCartCompare(productId) {
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

function formatCurrency(num) {
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
  return '$' + num.toFixed(2);
}

function formatNumber(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-enter`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => { toast.classList.remove('toast-show'); toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 400); }, 3500);
}
