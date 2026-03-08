// ===== StockMart - Analytics JS =====
const API = '';

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
  loadAnalytics();
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
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

async function loadAnalytics() {
  try {
    const [overviewRes, distributionRes, sectorsRes, gainersRes, losersRes, categoriesRes] = await Promise.all([
      fetch(`${API}/api/analytics/overview`),
      fetch(`${API}/api/analytics/distribution`),
      fetch(`${API}/api/analytics/sectors`),
      fetch(`${API}/api/products/top-gainers?limit=10`),
      fetch(`${API}/api/products/top-losers?limit=10`),
      fetch(`${API}/api/products/categories`)
    ]);

    const overview = await overviewRes.json();
    const distribution = await distributionRes.json();
    const sectors = await sectorsRes.json();
    const gainers = await gainersRes.json();
    const losers = await losersRes.json();
    const categories = await categoriesRes.json();

    // Overview cards
    setEl('ovMarketCap', formatCurrency(overview.totalMarketCap));
    setEl('ovVolume', formatNumber(overview.totalVolume));
    setEl('ovGainers', overview.gainers);
    setEl('ovLosers', overview.losers);
    setEl('ovAvgPrice', '$' + overview.avgStockPrice.toFixed(2));
    const avgChangeEl = document.getElementById('ovAvgChange');
    if (avgChangeEl) {
      avgChangeEl.textContent = (overview.avgChange > 0 ? '+' : '') + overview.avgChange.toFixed(2) + '%';
      avgChangeEl.classList.add(overview.avgChange >= 0 ? 'text-success' : 'text-danger');
    }

    // Charts
    createSectorChart(sectors);
    createDistributionChart(distribution);
    createVolumeChart(sectors);
    createMarketCapChart(sectors);

    // Heatmap
    renderHeatmap(sectors);

    // Tables
    renderTable('gainersTable', gainers);
    renderTable('losersTable', losers);

    // Screener categories
    const select = document.getElementById('screenerCategory');
    if (select) {
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.category;
        opt.textContent = c.category;
        select.appendChild(opt);
      });
    }

  } catch (err) {
    console.error('Error loading analytics:', err);
  }
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// === Charts ===
const chartColors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#0984e3', '#d63031', '#e17055', '#00b894'];

function createSectorChart(sectors) {
  const ctx = document.getElementById('sectorChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sectors.map(s => s.sector),
      datasets: [{
        label: 'Avg Change %',
        data: sectors.map(s => s.avg_change?.toFixed(2)),
        backgroundColor: sectors.map((_, i) => chartColors[i % chartColors.length] + '80'),
        borderColor: sectors.map((_, i) => chartColors[i % chartColors.length]),
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#8888aa', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#8888aa', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function createDistributionChart(distribution) {
  const ctx = document.getElementById('distributionChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: distribution.map(d => d.label),
      datasets: [{
        data: distribution.map(d => d.count),
        backgroundColor: chartColors,
        borderColor: '#0a0a1a',
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#8888aa', padding: 12, usePointStyle: true, font: { size: 11 } }
        }
      }
    }
  });
}

function createVolumeChart(sectors) {
  const ctx = document.getElementById('volumeChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: sectors.map(s => s.sector),
      datasets: [{
        label: 'Total Volume',
        data: sectors.map(s => s.total_volume),
        borderColor: '#00cec9',
        backgroundColor: 'rgba(0, 206, 201, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: chartColors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8888aa', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#8888aa', callback: v => formatNumber(v) }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function createMarketCapChart(sectors) {
  const ctx = document.getElementById('marketCapChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: sectors.map(s => s.sector),
      datasets: [{
        data: sectors.map(s => s.total_market_cap),
        backgroundColor: chartColors.map(c => c + '60'),
        borderColor: chartColors,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#8888aa', padding: 10, usePointStyle: true, font: { size: 10 } }
        }
      },
      scales: {
        r: {
          ticks: { display: false },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

// === Heatmap ===
function renderHeatmap(sectors) {
  const grid = document.getElementById('heatmapGrid');
  if (!grid) return;

  grid.innerHTML = sectors.map(s => {
    const change = s.avg_change || 0;
    const intensity = Math.min(Math.abs(change) / 10, 1);
    let bg;
    if (change >= 0) {
      bg = `rgba(0, 184, 148, ${0.2 + intensity * 0.6})`;
    } else {
      bg = `rgba(214, 48, 49, ${0.2 + intensity * 0.6})`;
    }
    return `
      <div class="heatmap-cell" style="background:${bg}" onclick="window.location.href='products.html?category=${encodeURIComponent(s.sector)}'">
        <h4>${s.sector}</h4>
        <div class="heatmap-change">${change > 0 ? '+' : ''}${change.toFixed(2)}%</div>
        <div class="heatmap-details">${s.total_stocks} stocks · ${s.advancing} adv · ${s.declining} dec</div>
      </div>
    `;
  }).join('');
}

// === Tables ===
function renderTable(bodyId, products) {
  const body = document.getElementById(bodyId);
  if (!body) return;

  body.innerHTML = products.map(p => {
    const cls = p.stock_change_percent >= 0 ? 'positive' : 'negative';
    return `
      <tr>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(p.name)}</td>
        <td>$${p.stock_price.toFixed(2)}</td>
        <td class="${cls}">${p.stock_change_percent > 0 ? '+' : ''}${p.stock_change_percent.toFixed(2)}%</td>
        <td>${formatNumber(p.volume)}</td>
      </tr>
    `;
  }).join('');
}

// === Screener ===
async function runScreener() {
  const params = new URLSearchParams();
  const cat = document.getElementById('screenerCategory')?.value;
  const minChange = document.getElementById('screenerMinChange')?.value;
  const maxChange = document.getElementById('screenerMaxChange')?.value;
  const minPE = document.getElementById('screenerMinPE')?.value;
  const maxPE = document.getElementById('screenerMaxPE')?.value;
  const minVol = document.getElementById('screenerMinVol')?.value;

  if (cat) params.set('category', cat);
  if (minChange) params.set('minChange', minChange);
  if (maxChange) params.set('maxChange', maxChange);
  if (minPE) params.set('minPE', minPE);
  if (maxPE) params.set('maxPE', maxPE);
  if (minVol) params.set('minVol', minVol);

  try {
    const res = await fetch(`${API}/api/analytics/screener?${params.toString()}`);
    const products = await res.json();
    
    const body = document.getElementById('screenerBody');
    if (!body) return;

    if (products.length === 0) {
      body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#888">No matching stocks found</td></tr>';
      return;
    }

    body.innerHTML = products.map(p => {
      const cls = p.stock_change_percent >= 0 ? 'positive' : 'negative';
      return `
        <tr>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.category)}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td>$${p.stock_price.toFixed(2)}</td>
          <td class="${cls}">${p.stock_change_percent > 0 ? '+' : ''}${p.stock_change_percent.toFixed(2)}%</td>
          <td>${formatNumber(p.volume)}</td>
          <td>${p.pe_ratio.toFixed(1)}</td>
          <td>${formatCurrency(p.market_cap)}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Screener error:', err);
  }
}

// === Utility ===
function formatCurrency(num) {
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
  return '$' + (num || 0).toFixed(2);
}

function formatNumber(num) {
  if (!num) return '0';
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
