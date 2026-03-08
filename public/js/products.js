// ===== StockMart - Products JS =====
const API = '';
let currentPage = 1;
let currentView = 'grid';
let wishlistedIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('show');
    });
  }

  checkAuth();
  loadCategories();
  loadWishlistState().then(() => {
  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('category');
  const id = params.get('id');
  const searchParam = params.get('search');
  
  if (cat) {
    document.getElementById('categoryFilter').value = cat;
  }
  if (searchParam) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = searchParam;
  }
  
  loadProducts();
  
  if (id) {
    openProductModal(id);
  }

  // Search with debounce
  let searchTimeout;
  document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { currentPage = 1; loadProducts(); }, 300);
  });

  document.getElementById('categoryFilter')?.addEventListener('change', () => { currentPage = 1; loadProducts(); });
  document.getElementById('sortFilter')?.addEventListener('change', () => { currentPage = 1; loadProducts(); });
  });
});

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
  updateCartBadge();
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
    const res = await fetch(`${API}/api/cart/count`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    badge.textContent = data.count || 0;
    badge.style.display = data.count > 0 ? 'inline-flex' : 'none';
  } catch(e) {}
}

async function loadCategories() {
  try {
    const res = await fetch(`${API}/api/products/categories`);
    const categories = await res.json();
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.category;
      opt.textContent = `${c.category} (${c.count})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

async function loadProducts() {
  const search = document.getElementById('searchInput')?.value || '';
  const category = document.getElementById('categoryFilter')?.value || '';
  const sortVal = document.getElementById('sortFilter')?.value || 'id';
  
  let sort = sortVal;
  let order = 'asc';
  if (sortVal.includes('-')) {
    const parts = sortVal.split('-');
    sort = parts[0];
    order = parts[1];
  }

  try {
    const url = `${API}/api/products?page=${currentPage}&limit=20&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&sort=${sort}&order=${order}`;
    const res = await fetch(url);
    const data = await res.json();

    renderProducts(data.products);
    renderPagination(data.pagination);
    
    const count = document.getElementById('resultsCount');
    if (count) count.textContent = `Showing ${data.products.length} of ${data.pagination.total} products`;
    
  } catch (err) {
    console.error('Error loading products:', err);
    const grid = document.getElementById('productsGrid');
    if (grid) grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888">Error loading products. Is the server running?</p>';
  }
}

function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:40px;color:#888">No products found</p>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const changeClass = p.stock_change_percent >= 0 ? 'positive' : 'negative';
    const badgeClass = p.stock_change_percent >= 0 ? 'badge-gainer' : 'badge-loser';
    const changeIcon = p.stock_change_percent >= 0 ? '▲' : '▼';
    const hearted = wishlistedIds.has(p.id) ? 'hearted' : '';
    
    return `
      <div class="product-card card-animate">
        <div class="product-image-wrapper" onclick="openProductModal(${p.id})">
          <img src="${p.image_url}" alt="${escapeHtml(p.name)}" class="product-image" loading="lazy" onerror="this.src='https://placehold.co/400x400/1a1a3e/6c5ce7?text=Product'">
          <span class="product-badge ${badgeClass}">${changeIcon} ${Math.abs(p.stock_change_percent).toFixed(1)}%</span>
          <button class="wishlist-btn ${hearted}" onclick="event.stopPropagation();toggleWishlist(${p.id}, this)" title="Add to Wishlist">
            <i class="${hearted ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
        <div class="product-details" onclick="openProductModal(${p.id})">
          <div class="product-category">${escapeHtml(p.category)}</div>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-prices">
            <span class="product-price">$${p.price.toFixed(2)}</span>
            <span class="product-stock-change ${changeClass}">
              ${p.stock_change_percent > 0 ? '+' : ''}${p.stock_change_percent.toFixed(2)}%
            </span>
          </div>
          <div class="product-meta">
            <span class="product-rating">${renderStars(p.rating)} ${p.rating.toFixed(1)}</span>
            <span class="product-volume"><i class="fas fa-chart-bar"></i> ${formatNumber(p.volume)}</span>
          </div>
        </div>
        <div class="product-card-actions">
          <button class="btn btn-primary btn-add-cart" onclick="addToCart(${p.id}, event)">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openBuyStockModal(${p.id})" title="Invest">
            <i class="fas fa-chart-line"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!container) return;

  const { page, totalPages } = pagination;
  let html = '';

  if (page > 1) {
    html += `<button class="page-btn" onclick="goToPage(${page - 1})"><i class="fas fa-chevron-left"></i></button>`;
  }

  const start = Math.max(1, page - 3);
  const end = Math.min(totalPages, page + 3);

  if (start > 1) html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
  if (start > 2) html += `<span style="color:#888;padding:10px">...</span>`;

  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (end < totalPages - 1) html += `<span style="color:#888;padding:10px">...</span>`;
  if (end < totalPages) html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;

  if (page < totalPages) {
    html += `<button class="page-btn" onclick="goToPage(${page + 1})"><i class="fas fa-chevron-right"></i></button>`;
  }

  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadProducts();
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

function toggleView(view) {
  currentView = view;
  const grid = document.getElementById('productsGrid');
  const btns = document.querySelectorAll('.view-btn');
  
  if (grid) {
    grid.classList.toggle('list-view', view === 'list');
  }
  btns.forEach(btn => btn.classList.remove('active'));
  if (view === 'grid') btns[0]?.classList.add('active');
  else btns[1]?.classList.add('active');
}

// === Product Modal ===
let modalChart = null;

async function openProductModal(id) {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('modalContent');
  if (!modal || !content) return;

  modal.classList.add('show');

  try {
    const [productRes, historyRes] = await Promise.all([
      fetch(`${API}/api/products/${id}`),
      fetch(`${API}/api/analytics/history/${id}`)
    ]);
    
    const product = await productRes.json();
    const history = await historyRes.json();

    const changeClass = product.stock_change_percent >= 0 ? 'text-success' : 'text-danger';
    const arrow = product.stock_change_percent >= 0 ? '▲' : '▼';

    content.innerHTML = `
      <div class="modal-product-header">
        <img src="${product.image_url}" alt="${escapeHtml(product.name)}" class="modal-product-image" onerror="this.src='https://placehold.co/250x250/1a1a3e/6c5ce7?text=Product'">
        <div class="modal-product-info">
          <div class="modal-category">${escapeHtml(product.category)} > ${escapeHtml(product.subcategory || '')}</div>
          <h2>${escapeHtml(product.name)}</h2>
          <p style="color:var(--text-dim);margin-bottom:15px">${escapeHtml(product.description || '')}</p>
          <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
            <span style="font-size:2rem;font-weight:800;color:var(--primary-light)">$${product.price.toFixed(2)}</span>
            <span class="${changeClass}" style="font-size:1.3rem;font-weight:700">${arrow} ${Math.abs(product.stock_change_percent).toFixed(2)}%</span>
          </div>
          <div style="margin-top:10px">${renderStars(product.rating)} <span style="color:var(--text-dim)">${product.rating.toFixed(1)} (${product.reviews.toLocaleString()} reviews)</span></div>
        </div>
      </div>

      <div class="modal-stats-grid">
        <div class="modal-stat">
          <div class="modal-stat-label">Stock Price</div>
          <div class="modal-stat-value">$${product.stock_price.toFixed(2)}</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-label">Volume</div>
          <div class="modal-stat-value">${formatNumber(product.volume)}</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-label">Market Cap</div>
          <div class="modal-stat-value">${formatCurrency(product.market_cap)}</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-label">P/E Ratio</div>
          <div class="modal-stat-value">${product.pe_ratio.toFixed(2)}</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-label">52W High</div>
          <div class="modal-stat-value text-success">$${product.high_52w.toFixed(2)}</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-label">52W Low</div>
          <div class="modal-stat-value text-danger">$${product.low_52w.toFixed(2)}</div>
        </div>
      </div>

      <div class="modal-chart">
        <h3 style="margin-bottom:15px"><i class="fas fa-chart-line"></i> 30-Day Price History</h3>
        <canvas id="modalPriceChart" height="200"></canvas>
      </div>

      <div class="modal-actions">
        <button class="btn btn-primary btn-glow btn-lg" onclick="addToCart(${product.id}, event)">
          <i class="fas fa-cart-plus"></i> Add to Cart — $${product.price.toFixed(2)}
        </button>
        <button class="btn btn-secondary btn-lg" onclick="addToCompare(${product.id})"><i class="fas fa-balance-scale"></i> Compare</button>
        <a href="cart.html" class="btn btn-secondary btn-lg"><i class="fas fa-shopping-cart"></i> View Cart</a>
      </div>

      <!-- Reviews Section -->
      <div class="modal-reviews" style="margin-top:25px;border-top:1px solid var(--glass-border);padding-top:20px">
        <h3 style="margin-bottom:15px"><i class="fas fa-star"></i> Customer Reviews</h3>
        <div id="reviewsContainer" data-product-id="${product.id}">
          <div style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin"></i> Loading reviews...</div>
        </div>
      </div>
    `;

    // Load reviews
    loadProductReviews(product.id);

    // Render chart
    if (modalChart) modalChart.destroy();
    const ctx = document.getElementById('modalPriceChart');
    if (ctx && history.length > 0) {
      modalChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(h => new Date(h.recorded_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })),
          datasets: [{
            label: 'Price',
            data: history.map(h => h.price),
            borderColor: product.stock_change_percent >= 0 ? '#00b894' : '#d63031',
            backgroundColor: product.stock_change_percent >= 0 ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#8888aa', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
  } catch (err) {
    content.innerHTML = '<p style="padding:40px;text-align:center;color:#888">Error loading product details</p>';
  }
}

function closeModal() {
  const modal = document.getElementById('productModal');
  if (modal) modal.classList.remove('show');
  if (modalChart) { modalChart.destroy(); modalChart = null; }
}

// Close modal on overlay click
document.getElementById('productModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'productModal') closeModal();
});

// Close modal on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// === Add to Cart ===
async function addToCart(productId, event) {
  if (event) event.stopPropagation();
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const btn = event?.target?.closest('button');
  if (btn) {
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    btn.disabled = true;
    try {
      const res = await fetch(`${API}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, quantity: 1 })
      });
      const data = await res.json();
      btn.innerHTML = '<i class="fas fa-check"></i> Added!';
      btn.classList.add('btn-success');
      showToast('🛒 Added to cart!', 'success');
      updateCartBadge();
      setTimeout(() => { btn.innerHTML = origHTML; btn.disabled = false; btn.classList.remove('btn-success'); }, 1500);
    } catch(e) {
      btn.innerHTML = origHTML;
      btn.disabled = false;
      showToast('Error adding to cart', 'error');
    }
  }
}

// === Wishlist ===
async function loadWishlistState() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/wishlist`, { headers: { 'Authorization': `Bearer ${token}` } });
    const items = await res.json();
    wishlistedIds = new Set(items.map(i => i.product_id));
  } catch(e) {}
}

async function toggleWishlist(productId, btn) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  try {
    const res = await fetch(`${API}/api/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId })
    });
    const data = await res.json();
    if (data.liked) {
      wishlistedIds.add(productId);
      btn.classList.add('hearted');
      btn.innerHTML = '<i class="fas fa-heart"></i>';
      btn.classList.add('heart-pop');
      setTimeout(() => btn.classList.remove('heart-pop'), 600);
      showToast('❤️ Added to wishlist!', 'success');
    } else {
      wishlistedIds.delete(productId);
      btn.classList.remove('hearted');
      btn.innerHTML = '<i class="far fa-heart"></i>';
      showToast('Removed from wishlist', 'info');
    }
  } catch(e) { showToast('Error', 'error'); }
}

// === Quick Invest from Products ===
function openBuyStockModal(productId) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  window.location.href = `invest.html?buy=${productId}`;
}

// === Toast Notifications ===
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-enter`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => { toast.classList.remove('toast-show'); toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 400); }, 3500);
}

// === Utility ===
function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) stars += '<i class="fas fa-star star"></i>';
    else if (i - 0.5 <= rating) stars += '<i class="fas fa-star-half-alt star"></i>';
    else stars += '<i class="far fa-star star"></i>';
  }
  return stars;
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
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === Product Reviews ===
async function loadProductReviews(productId) {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;
  try {
    const res = await fetch(`${API}/api/reviews/product/${productId}`);
    const data = await res.json();
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    let html = '';

    // Rating breakdown
    html += `<div class="review-summary" style="display:flex;gap:25px;margin-bottom:20px;flex-wrap:wrap">
      <div style="text-align:center;min-width:100px">
        <div style="font-size:3rem;font-weight:800;color:var(--primary-light)">${data.avgRating}</div>
        <div>${renderStars(data.avgRating)}</div>
        <div style="color:var(--text-dim);font-size:0.85rem;margin-top:4px">${data.total} review${data.total !== 1 ? 's' : ''}</div>
      </div>
      <div style="flex:1;min-width:200px">
        ${data.breakdown.map(b => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="width:20px;font-size:0.8rem;color:var(--text-dim)">${b.star}★</span>
            <div style="flex:1;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${b.percent}%;background:linear-gradient(90deg,#fdcb6e,#e17055);border-radius:4px;transition:width 0.5s"></div>
            </div>
            <span style="width:35px;font-size:0.75rem;color:var(--text-dim)">${b.percent}%</span>
          </div>
        `).join('')}
      </div>
    </div>`;

    // Write review form
    if (token) {
      html += `
        <div class="review-form" style="margin-bottom:20px;padding:15px;background:rgba(108,92,231,0.06);border-radius:12px;border:1px solid var(--glass-border)">
          <h4 style="margin-bottom:12px"><i class="fas fa-pen"></i> Write a Review</h4>
          <div class="star-rating-input" style="margin-bottom:10px">
            ${[1,2,3,4,5].map(s => `<i class="far fa-star review-star" data-rating="${s}" onclick="setReviewRating(${s})" style="font-size:1.5rem;cursor:pointer;color:#fdcb6e;margin-right:4px"></i>`).join('')}
            <span id="ratingText" style="color:var(--text-dim);margin-left:8px;font-size:0.85rem">Select rating</span>
          </div>
          <input type="text" id="reviewTitle" class="filter-input" placeholder="Review title" style="margin-bottom:8px" maxlength="200">
          <textarea id="reviewComment" class="filter-input" placeholder="Share your experience..." rows="3" style="margin-bottom:8px" maxlength="2000"></textarea>
          <button class="btn btn-primary btn-sm" onclick="submitReview(${productId})"><i class="fas fa-paper-plane"></i> Submit Review</button>
        </div>`;
    }

    // Review list
    if (data.reviews.length > 0) {
      html += data.reviews.map(r => `
        <div class="review-card" style="padding:12px;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.05)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <i class="fas fa-user-circle" style="font-size:1.2rem;color:var(--primary-light)"></i>
              <span style="font-weight:600;font-size:0.9rem">${escapeHtml(r.username)}</span>
              ${r.verified_purchase ? '<span style="background:rgba(0,184,148,0.15);color:#00b894;padding:2px 8px;border-radius:10px;font-size:0.7rem">✓ Verified</span>' : ''}
            </div>
            <span style="color:var(--text-dim);font-size:0.75rem">${new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
          </div>
          <div style="margin-bottom:4px">${renderStars(r.rating)}</div>
          <div style="font-weight:600;font-size:0.95rem;margin-bottom:3px">${escapeHtml(r.title)}</div>
          <div style="color:var(--text-dim);font-size:0.88rem;line-height:1.5">${escapeHtml(r.comment)}</div>
          <div style="margin-top:8px;display:flex;gap:10px;align-items:center">
            <button class="btn btn-secondary btn-sm" style="font-size:0.75rem" onclick="markHelpful(${r.id})"><i class="fas fa-thumbs-up"></i> Helpful (${r.helpful_count || 0})</button>
            ${user && (r.user_id === user.id || user.role === 'admin') ? `<button class="btn btn-danger btn-sm" style="font-size:0.75rem" onclick="deleteReview(${r.id}, ${productId})"><i class="fas fa-trash"></i></button>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      html += '<p style="text-align:center;color:var(--text-dim);padding:15px">No reviews yet. Be the first to review!</p>';
    }

    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = '<p style="color:var(--text-dim);text-align:center">Error loading reviews</p>';
  }
}

let selectedRating = 0;
function setReviewRating(rating) {
  selectedRating = rating;
  document.querySelectorAll('.review-star').forEach((star, i) => {
    star.className = (i < rating ? 'fas' : 'far') + ' fa-star review-star';
  });
  const texts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  const el = document.getElementById('ratingText');
  if (el) el.textContent = texts[rating];
}

async function submitReview(productId) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  if (!selectedRating) { showToast('Please select a rating', 'error'); return; }
  const title = document.getElementById('reviewTitle').value.trim();
  const comment = document.getElementById('reviewComment').value.trim();
  if (!title || !comment) { showToast('Please fill title and comment', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/reviews/product/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ rating: selectedRating, title, comment })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast('Review submitted!', 'success');
    selectedRating = 0;
    loadProductReviews(productId);
  } catch(e) { showToast('Error submitting review', 'error'); }
}

async function markHelpful(reviewId) {
  const token = localStorage.getItem('token');
  if (!token) { showToast('Login to mark helpful', 'info'); return; }
  try {
    await fetch(`${API}/api/reviews/${reviewId}/helpful`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const productId = document.getElementById('reviewsContainer')?.dataset.productId;
    if (productId) loadProductReviews(parseInt(productId));
  } catch(e) {}
}

async function deleteReview(reviewId, productId) {
  if (!confirm('Delete this review?')) return;
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API}/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    showToast('Review deleted', 'info');
    loadProductReviews(productId);
  } catch(e) { showToast('Error', 'error'); }
}

// === Product Comparison ===
function getCompareList() {
  return JSON.parse(localStorage.getItem('compareList') || '[]');
}

function addToCompare(productId) {
  let list = getCompareList();
  if (list.includes(productId)) {
    list = list.filter(id => id !== productId);
    localStorage.setItem('compareList', JSON.stringify(list));
    showToast('Removed from comparison', 'info');
  } else {
    if (list.length >= 4) { showToast('Max 4 products to compare', 'warning'); return; }
    list.push(productId);
    localStorage.setItem('compareList', JSON.stringify(list));
    showToast('Added to comparison! Go to Compare page', 'success');
  }
  updateCompareCount();
}

function updateCompareCount() {
  const badge = document.getElementById('compareBadge');
  if (!badge) return;
  const count = getCompareList().length;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}
