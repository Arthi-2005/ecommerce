// ===== StockMart - Main App JS =====
const API = '';

// === Loader ===
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hide');
  }, 1500);
});

// === Mobile Menu ===
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('show');
    });
  }

  // Check auth state
  checkAuth();
  
  // Load home page data
  loadHomeData();
  
  // Create particles
  createParticles();
  
  // Counter animation
  animateCounters();
});

// === Auth Check ===
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
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/cart/count`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.textContent = data.count || 0;
      b.style.display = data.count > 0 ? 'flex' : 'none';
    });
  } catch(e) {}
}

// === Load Home Data ===
async function loadHomeData() {
  try {
    // Load overview
    const overviewRes = await fetch(`${API}/api/analytics/overview`);
    const overview = await overviewRes.json();
    
    const gainersEl = document.getElementById('gainersCount');
    const marketCapEl = document.getElementById('marketCap');
    if (gainersEl) gainersEl.textContent = overview.gainers;
    if (marketCapEl) marketCapEl.textContent = formatCurrency(overview.totalMarketCap);

    // Load categories
    const catRes = await fetch(`${API}/api/products/categories`);
    const categories = await catRes.json();
    renderCategories(categories);

    // Load top gainers & losers
    const [gainersRes, losersRes] = await Promise.all([
      fetch(`${API}/api/products/top-gainers?limit=5`),
      fetch(`${API}/api/products/top-losers?limit=5`)
    ]);
    
    const gainers = await gainersRes.json();
    const losers = await losersRes.json();
    renderMovers('topGainers', gainers, true);
    renderMovers('topLosers', losers, false);

    // Load featured products
    const featRes = await fetch(`${API}/api/products?limit=8&sort=rating&order=desc`);
    const featData = await featRes.json();
    renderFeaturedProducts(featData.products);

    // Load ticker
    const tickerRes = await fetch(`${API}/api/products/most-active?limit=20`);
    const tickerData = await tickerRes.json();
    renderTicker(tickerData);

    // Hero chart
    createHeroChart(overview.categoryStats);
    
  } catch (err) {
    console.error('Error loading home data:', err);
  }
}

// === Render Categories ===
function renderCategories(categories) {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  const icons = {
    'Electronics': 'fas fa-microchip',
    'Fashion': 'fas fa-tshirt',
    'Home & Kitchen': 'fas fa-couch',
    'Books': 'fas fa-book',
    'Sports & Fitness': 'fas fa-futbol',
    'Beauty & Health': 'fas fa-spa',
    'Grocery': 'fas fa-apple-whole',
    'Automotive': 'fas fa-car'
  };

  grid.innerHTML = categories.map(cat => `
    <a href="products.html?category=${encodeURIComponent(cat.category)}" class="category-card slide-up" style="--delay: ${Math.random() * 0.3}s">
      <div class="category-icon"><i class="${icons[cat.category] || 'fas fa-box'}"></i></div>
      <div class="category-name">${cat.category}</div>
      <div class="category-count">${cat.count} Products</div>
    </a>
  `).join('');
}

// === Render Movers ===
function renderMovers(containerId, products, isGainer) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = products.map((p, i) => `
    <div class="mover-item">
      <div class="mover-info">
        <div class="mover-rank">${i + 1}</div>
        <div>
          <div class="mover-name">${p.name}</div>
          <div class="mover-category">${p.category}</div>
        </div>
      </div>
      <div class="mover-change ${isGainer ? 'positive' : 'negative'}">
        ${p.stock_change_percent > 0 ? '+' : ''}${p.stock_change_percent.toFixed(2)}%
      </div>
    </div>
  `).join('');
}

// === Render Featured Products ===
function renderFeaturedProducts(products) {
  const grid = document.getElementById('featuredProducts');
  if (!grid) return;

  grid.innerHTML = products.map(p => createProductCard(p)).join('');
}

// === Product Card HTML ===
function createProductCard(p) {
  const changeClass = p.stock_change_percent >= 0 ? 'positive' : 'negative';
  const badgeClass = p.stock_change_percent >= 0 ? 'badge-gainer' : 'badge-loser';
  const changeIcon = p.stock_change_percent >= 0 ? '▲' : '▼';
  
  return `
    <div class="product-card" onclick="window.location.href='products.html?id=${p.id}'">
      <div class="product-image-wrapper">
        <img src="${p.image_url}" alt="${escapeHtml(p.name)}" class="product-image" loading="lazy" onerror="this.src='https://placehold.co/400x400/1a1a3e/6c5ce7?text=Product'">
        <span class="product-badge ${badgeClass}">${changeIcon} ${Math.abs(p.stock_change_percent).toFixed(1)}%</span>
      </div>
      <div class="product-details">
        <div class="product-category">${escapeHtml(p.category)}</div>
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-prices">
          <span class="product-price">$${p.price.toFixed(2)}</span>
          <span class="product-stock-change ${changeClass}">
            ${p.stock_change_percent > 0 ? '+' : ''}${p.stock_change_percent.toFixed(2)}%
          </span>
        </div>
        <div class="product-meta">
          <span class="product-rating">
            ${renderStars(p.rating)} ${p.rating.toFixed(1)}
          </span>
          <span class="product-volume">
            <i class="fas fa-chart-bar"></i> ${formatNumber(p.volume)}
          </span>
        </div>
      </div>
    </div>
  `;
}

// === Render Stars ===
function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) stars += '<i class="fas fa-star star"></i>';
    else if (i - 0.5 <= rating) stars += '<i class="fas fa-star-half-alt star"></i>';
    else stars += '<i class="far fa-star star"></i>';
  }
  return stars;
}

// === Ticker ===
function renderTicker(products) {
  const ticker = document.getElementById('tickerContent');
  if (!ticker) return;

  const items = products.map(p => {
    const changeClass = p.stock_change_percent >= 0 ? 'up' : 'down';
    const arrow = p.stock_change_percent >= 0 ? '▲' : '▼';
    return `
      <span class="ticker-item">
        <span class="ticker-name">${escapeHtml(p.name.substring(0, 25))}</span>
        <span class="ticker-price">$${p.stock_price.toFixed(2)}</span>
        <span class="ticker-change ${changeClass}">${arrow} ${Math.abs(p.stock_change_percent).toFixed(2)}%</span>
      </span>
    `;
  }).join('');

  ticker.innerHTML = items + items; // Duplicate for seamless scrolling
}

// === Hero Chart ===
function createHeroChart(categoryStats) {
  const canvas = document.getElementById('heroChart');
  if (!canvas || !categoryStats) return;

  const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#0984e3', '#d63031', '#e17055', '#00b894'];

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: categoryStats.map(c => c.category),
      datasets: [{
        label: 'Avg Stock Price',
        data: categoryStats.map(c => c.avg_price?.toFixed(2)),
        borderColor: '#6c5ce7',
        backgroundColor: 'rgba(108, 92, 231, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: colors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#8888aa', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: '#8888aa' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

// === Particles ===
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#0984e3'];
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = Math.random() * 8 + 3;
    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation-delay: ${Math.random() * 6}s;
      animation-duration: ${Math.random() * 6 + 4}s;
    `;
    container.appendChild(particle);
  }
}

// === Counter Animation ===
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  counters.forEach(counter => {
    const target = parseInt(counter.dataset.target);
    const increment = target / 60;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = target.toLocaleString();
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current).toLocaleString();
      }
    }, 30);
  });
}

// === Utility Functions ===
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
