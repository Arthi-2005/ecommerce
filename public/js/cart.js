// ===== StockMart - Cart JS =====
const API = '';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  const token = localStorage.getItem('token');
  if (!token) {
    document.getElementById('loginRequired').style.display = 'block';
    return;
  }
  document.getElementById('cartContent').style.display = 'block';
  loadCart();
  loadRecentOrders();
  checkLastOrderBanner();
});

function initNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('show');
    });
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
        <a href="invest.html" class="nav-dd-item"><i class="fas fa-coins"></i> Investments</a>
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

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const token = localStorage.getItem('token');
  if (!badge || !token) return;
  try {
    const res = await fetch(`${API}/api/cart/count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    badge.textContent = data.count || 0;
    badge.style.display = data.count > 0 ? 'inline-flex' : 'none';
  } catch(e) { badge.textContent = '0'; }
}

async function loadCart() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.items.length === 0) {
      document.querySelector('.cart-layout').style.display = 'none';
      document.getElementById('emptyCart').style.display = 'block';
      return;
    }

    document.querySelector('.cart-layout').style.display = 'grid';
    document.getElementById('emptyCart').style.display = 'none';
    document.getElementById('itemCount').textContent = data.totalItems;

    const container = document.getElementById('cartItems');
    container.innerHTML = data.items.map(item => {
      const p = item.product;
      const itemTotal = (p.price * item.quantity).toFixed(2);
      const changeClass = p.stock_change_percent >= 0 ? 'positive' : 'negative';
      const arrow = p.stock_change_percent >= 0 ? '▲' : '▼';
      return `
        <div class="cart-item glass-card fade-in">
          <div class="cart-item-image">
            <img src="${p.image_url}" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/120x120/1a1a3e/6c5ce7?text=Product'">
            <span class="cart-stock-badge ${changeClass}">${arrow} ${Math.abs(p.stock_change_percent).toFixed(1)}%</span>
          </div>
          <div class="cart-item-details">
            <div class="cart-item-category">${escapeHtml(p.category)}</div>
            <div class="cart-item-name">${escapeHtml(p.name)}</div>
            <div class="cart-item-price">$${p.price.toFixed(2)}</div>
            <div class="cart-item-rating">${renderStars(p.rating)} ${p.rating.toFixed(1)}</div>
          </div>
          <div class="cart-item-actions">
            <div class="quantity-control">
              <button class="qty-btn" onclick="updateQty(${item.id}, ${item.quantity - 1})"><i class="fas fa-minus"></i></button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="updateQty(${item.id}, ${item.quantity + 1})"><i class="fas fa-plus"></i></button>
            </div>
            <div class="cart-item-total">$${itemTotal}</div>
            <button class="btn btn-danger btn-sm" onclick="removeItem(${item.id})">
              <i class="fas fa-trash"></i> Remove
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Update summary
    const subtotal = data.total;
    const tax = (subtotal * 0.18).toFixed(2);
    const shipping = subtotal > 500 ? 0 : 49.99;
    const grand = (subtotal + parseFloat(tax) + shipping).toFixed(2);

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax}`;
    document.getElementById('shipping').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('grandTotal').textContent = `$${grand}`;

    const note = document.getElementById('freeShipNote');
    if (note) {
      if (subtotal > 500) {
        note.innerHTML = '<i class="fas fa-check-circle text-success"></i> Free shipping applied!';
        note.classList.add('text-success');
      } else {
        note.innerHTML = `<i class="fas fa-truck"></i> Add $${(500 - subtotal).toFixed(2)} more for free shipping!`;
        note.classList.remove('text-success');
      }
    }

    updateCartBadge();
  } catch (err) {
    console.error('Error loading cart:', err);
  }
}

async function updateQty(cartId, newQty) {
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API}/api/cart/update/${cartId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ quantity: newQty })
    });
    loadCart();
  } catch(e) { console.error(e); }
}

async function removeItem(cartId) {
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API}/api/cart/remove/${cartId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadCart();
  } catch(e) { console.error(e); }
}

async function clearCart() {
  if (!confirm('Clear all items from cart?')) return;
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API}/api/cart/clear`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadCart();
  } catch(e) { console.error(e); }
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

async function loadRecentOrders() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/orders/my-orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await res.json();
    if (!orders.length) return;

    const recent = orders.slice(0, 3);
    const tracker = document.getElementById('recentOrderTracker');
    const list = document.getElementById('recentOrdersList');
    if (!tracker || !list) return;

    tracker.style.display = 'block';
    list.innerHTML = recent.map(order => {
      const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const steps = ['confirmed', 'processing', 'shipped', 'delivered'];
      const currentIdx = order.status === 'cancelled' ? -1 : steps.indexOf(order.status);

      let trackingHtml;
      if (order.status === 'cancelled') {
        trackingHtml = `<div class="mini-tracking"><div class="mini-step cancelled active"><div class="mini-dot"><i class="fas fa-times"></i></div><span>Cancelled</span></div></div>`;
      } else {
        trackingHtml = `<div class="mini-tracking">${steps.map((s, i) => {
          const icons = { confirmed: 'fa-check', processing: 'fa-cog', shipped: 'fa-truck', delivered: 'fa-box-open' };
          let cls = 'mini-step';
          if (i < currentIdx) cls += ' completed';
          else if (i === currentIdx) cls += ' active';
          return `<div class="${cls}"><div class="mini-dot"><i class="fas ${icons[s]}"></i></div><span>${s.charAt(0).toUpperCase() + s.slice(1)}</span></div>${i < steps.length - 1 ? '<div class="mini-line ' + (i < currentIdx ? 'completed' : '') + '"></div>' : ''}`;
        }).join('')}</div>`;
      }

      return `<div class="recent-order-card glass-card fade-in">
        <div class="recent-order-header">
          <span class="recent-order-id"><i class="fas fa-receipt"></i> Order #${order.id}</span>
          <span class="recent-order-date">${date}</span>
          <span class="recent-order-total gradient-text">$${order.grandTotal.toFixed(2)}</span>
        </div>
        ${trackingHtml}
        <div class="recent-order-footer">
          <span>${order.item_count} item${order.item_count > 1 ? 's' : ''}</span>
          <a href="orders.html" class="btn btn-sm btn-secondary"><i class="fas fa-eye"></i> View Details</a>
        </div>
      </div>`;
    }).join('');
  } catch(e) { console.error('Recent orders error:', e); }
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// === Last Order Receipt Banner ===
function checkLastOrderBanner() {
  const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || 'null');
  if (!lastOrder) return;
  // Expire after 7 days
  if (Date.now() - lastOrder.timestamp > 7 * 24 * 60 * 60 * 1000) {
    localStorage.removeItem('lastOrder');
    return;
  }
  const banner = document.getElementById('lastOrderBanner');
  if (!banner) return;
  document.getElementById('lobOrderId').textContent = `#${lastOrder.id}`;
  document.getElementById('lobTotal').textContent = `$${Number(lastOrder.grandTotal).toFixed(2)}`;
  banner.style.display = 'flex';
  window._lastOrderIdBanner = lastOrder.id;
}

function downloadLastOrderReceipt() {
  const token = localStorage.getItem('token');
  const orderId = window._lastOrderIdBanner;
  if (!orderId || !token) return;
  window.location.href = `/api/orders/download/${orderId}?token=${encodeURIComponent(token)}`;
}

function dismissLastOrderBanner() {
  const banner = document.getElementById('lastOrderBanner');
  if (banner) banner.style.display = 'none';
  localStorage.removeItem('lastOrder');
}
