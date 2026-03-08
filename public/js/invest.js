// ===== StockMart - Invest JS =====
const API = '';
let portfolioChart = null;

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  const token = localStorage.getItem('token');
  if (!token) {
    document.getElementById('loginRequired').style.display = 'block';
  } else {
    document.getElementById('portfolioSection').style.display = 'block';
    loadPortfolio();
  }
  loadMarket();
  loadIPOs();
});

function initNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); mobileMenu.classList.toggle('show'); });
  }
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const loginBtn = document.getElementById('loginBtn');
  if (token && user && loginBtn) {
    const wrapper = document.createElement('div');
    wrapper.className = 'nav-user-dropdown';
    wrapper.innerHTML = `
      <button class="nav-user-btn" type="button">
        <i class="fas fa-user-circle"></i>
        <span class="nav-username">${esc(user.username)}</span>
        <span class="nav-role-badge nav-role-${user.role}">${user.role === 'admin' ? 'Admin' : 'User'}</span>
        <i class="fas fa-chevron-down nav-dd-arrow"></i>
      </button>
      <div class="nav-dropdown-menu" id="userDropdownMenu">
        <div class="nav-dd-header">
          <i class="fas fa-user-circle"></i>
          <div>
            <div class="nav-dd-name">${esc(user.username)}</div>
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

// === Portfolio ===
async function loadPortfolio() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/invest/portfolio`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const s = data.summary;

    document.getElementById('totalInvested').textContent = '$' + s.totalInvested.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
    document.getElementById('currentValue').textContent = '$' + s.currentValue.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
    
    const pnlEl = document.getElementById('totalPnl');
    pnlEl.textContent = (s.totalPnl >= 0 ? '+$' : '-$') + Math.abs(s.totalPnl).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + ` (${s.totalPnlPercent >= 0 ? '+' : ''}${s.totalPnlPercent.toFixed(2)}%)`;
    pnlEl.className = 'ov-value ' + (s.totalPnl >= 0 ? 'text-success' : 'text-danger');
    
    document.getElementById('totalHoldings').textContent = s.totalHoldings;

    if (data.investments.length > 0) {
      document.getElementById('holdingsSection').style.display = 'block';
      document.getElementById('portfolioChartSection').style.display = 'block';
      renderHoldings(data.investments);
      renderPortfolioChart(data.investments);
    }
  } catch(e) { console.error(e); }
}

function renderHoldings(investments) {
  const body = document.getElementById('holdingsBody');
  body.innerHTML = investments.map(inv => {
    const pnlClass = inv.pnl >= 0 ? 'text-success' : 'text-danger';
    const arrow = inv.pnl >= 0 ? '▲' : '▼';
    return `<tr class="fade-in">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${inv.image_url}" style="width:35px;height:35px;border-radius:8px;object-fit:cover" onerror="this.src='https://placehold.co/35/1a1a3e/6c5ce7?text=S'">
          <div>
            <div style="font-weight:600;font-size:0.9rem">${esc(inv.product_name).substring(0,30)}</div>
            <div style="font-size:0.75rem;color:var(--text-dim)">${esc(inv.product_category)}</div>
          </div>
        </div>
      </td>
      <td style="font-weight:700">${inv.shares}</td>
      <td>$${inv.buy_price.toFixed(2)}</td>
      <td>$${inv.current_price.toFixed(2)}</td>
      <td>$${inv.invested.toFixed(2)}</td>
      <td>$${inv.current_value.toFixed(2)}</td>
      <td class="${pnlClass}" style="font-weight:700">${arrow} $${Math.abs(inv.pnl).toFixed(2)} (${inv.pnl_percent >= 0 ? '+' : ''}${inv.pnl_percent.toFixed(2)}%)</td>
      <td><button class="btn btn-danger btn-sm" onclick="openSellModal(${inv.product_id}, '${esc(inv.product_name).replace(/'/g, "\\'")}', ${inv.shares}, ${inv.current_price})"><i class="fas fa-arrow-down"></i> Sell</button></td>
    </tr>`;
  }).join('');
}

function renderPortfolioChart(investments) {
  if (portfolioChart) portfolioChart.destroy();
  const ctx = document.getElementById('portfolioChart');
  if (!ctx) return;
  const colors = ['#6c5ce7','#00cec9','#fd79a8','#fdcb6e','#0984e3','#d63031','#e17055','#00b894','#a29bfe','#fab1a0'];
  portfolioChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: investments.map(i => i.product_name.substring(0, 20)),
      datasets: [{ data: investments.map(i => i.current_value), backgroundColor: colors, borderColor: '#0a0a1a', borderWidth: 3 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#8888aa', padding: 10, usePointStyle: true, font: { size: 11 } } } } }
  });
}

// === Market ===
async function loadMarket() {
  try {
    const res = await fetch(`${API}/api/invest/market`);
    const data = await res.json();
    renderStockList('investGainers', data.topGainers, true);
    renderStockList('investLosers', data.topLosers, false);
    renderStockList('investActive', data.mostActive, null);
  } catch(e) { console.error(e); }
}

function renderStockList(containerId, stocks, isGainer) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = stocks.map(s => {
    const changeClass = s.stock_change_percent >= 0 ? 'positive' : 'negative';
    const arrow = s.stock_change_percent >= 0 ? '▲' : '▼';
    return `
      <div class="invest-stock-row" onclick="openBuyModal(${s.id})">
        <img src="${s.image_url}" class="invest-stock-img" onerror="this.src='https://placehold.co/40/1a1a3e/6c5ce7?text=S'">
        <div class="invest-stock-info">
          <div class="invest-stock-name">${esc(s.name).substring(0, 35)}</div>
          <div class="invest-stock-cat">${esc(s.category)}</div>
        </div>
        <div class="invest-stock-price">$${s.stock_price.toFixed(2)}</div>
        <div class="invest-stock-change ${changeClass}">${arrow} ${Math.abs(s.stock_change_percent).toFixed(2)}%</div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openBuyModal(${s.id})"><i class="fas fa-plus"></i> Buy</button>
      </div>
    `;
  }).join('');
}

// === Buy Modal ===
async function openBuyModal(productId) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  document.getElementById('buyModal').classList.add('show');
  const content = document.getElementById('buyModalContent');
  content.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary)"></i></div>';
  
  try {
    const [prodRes, histRes] = await Promise.all([
      fetch(`${API}/api/products/${productId}`),
      fetch(`${API}/api/analytics/history/${productId}`)
    ]);
    const product = prodRes.ok ? await prodRes.json() : null;
    const history = histRes.ok ? await histRes.json() : [];
    if (!product) { content.innerHTML = '<p style="text-align:center;padding:40px;color:#888">Product not found</p>'; return; }
    
    const changeClass = product.stock_change_percent >= 0 ? 'text-success' : 'text-danger';
    const arrow = product.stock_change_percent >= 0 ? '▲' : '▼';

    content.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <img src="${product.image_url}" style="width:80px;height:80px;border-radius:16px;object-fit:cover;margin-bottom:10px" onerror="this.src='https://placehold.co/80/1a1a3e/6c5ce7?text=S'">
        <h2 style="font-size:1.2rem;margin:5px 0">${esc(product.name)}</h2>
        <span style="color:var(--text-dim);font-size:0.85rem">${esc(product.category)}</span>
      </div>
      <div class="modal-stats-grid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="modal-stat"><div class="modal-stat-label">Stock Price</div><div class="modal-stat-value">$${product.stock_price.toFixed(2)}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">Change</div><div class="modal-stat-value ${changeClass}">${arrow} ${Math.abs(product.stock_change_percent).toFixed(2)}%</div></div>
        <div class="modal-stat"><div class="modal-stat-label">P/E Ratio</div><div class="modal-stat-value">${product.pe_ratio.toFixed(1)}</div></div>
      </div>
      <div style="height:150px;margin:15px 0"><canvas id="buyModalChart"></canvas></div>
      <div class="form-group" style="margin-top:15px">
        <label style="font-weight:700;color:var(--text-dim);font-size:0.85rem">Number of Shares</label>
        <div style="display:flex;gap:10px;align-items:center;margin-top:8px">
          <input type="number" id="buyShares" value="1" min="1" max="1000" class="filter-input" style="flex:1;text-align:center;font-size:1.2rem;font-weight:700">
        </div>
        <div style="margin-top:8px;text-align:center;color:var(--text-dim);font-size:0.9rem">
          Total: <strong class="gradient-text" id="buyTotal">$${product.stock_price.toFixed(2)}</strong>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-primary btn-glow" style="flex:1;padding:14px" onclick="executeBuy(${product.id}, ${product.stock_price})">
          <i class="fas fa-arrow-up"></i> Buy Shares
        </button>
        <button class="btn btn-secondary" style="flex:1;padding:14px" onclick="closeBuyModal()">Cancel</button>
      </div>
    `;

    // Shares input listener
    document.getElementById('buyShares').addEventListener('input', (e) => {
      const shares = parseInt(e.target.value) || 0;
      document.getElementById('buyTotal').textContent = '$' + (shares * product.stock_price).toFixed(2);
    });

    // Chart
    if (history.length > 0) {
      const ctx = document.getElementById('buyModalChart');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(h => new Date(h.recorded_at).toLocaleDateString('en',{month:'short',day:'numeric'})),
          datasets: [{ data: history.map(h => h.price), borderColor: product.stock_change_percent >= 0 ? '#00b894' : '#d63031', backgroundColor: product.stock_change_percent >= 0 ? 'rgba(0,184,148,0.1)' : 'rgba(214,48,49,0.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { color: '#8888aa', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
      });
    }
  } catch(e) { content.innerHTML = '<p style="text-align:center;padding:40px;color:#888">Error loading</p>'; }
}

async function executeBuy(productId, price) {
  const token = localStorage.getItem('token');
  const shares = parseInt(document.getElementById('buyShares').value);
  if (!shares || shares < 1) { showToast('Enter valid shares', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/invest/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId, shares })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast(`🎉 ${data.message}`, 'success');
    closeBuyModal();
    loadPortfolio();
    // Show invest receipt
    showInvestReceipt('BUY', {
      productName: document.querySelector('#buyModalContent h2')?.textContent || 'Stock',
      shares: shares,
      pricePerShare: price,
      totalAmount: data.totalCost || (shares * price),
      type: 'Purchase'
    });
  } catch(e) { showToast('Network error', 'error'); }
}

function openSellModal(productId, name, maxShares, currentPrice) {
  const content = document.getElementById('buyModalContent');
  document.getElementById('buyModal').classList.add('show');
  content.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#d63031,#e17055);display:flex;align-items:center;justify-content:center;margin:0 auto 15px"><i class="fas fa-arrow-down" style="font-size:1.5rem;color:#fff"></i></div>
      <h2 style="font-size:1.2rem">Sell ${esc(name)}</h2>
      <p style="color:var(--text-dim)">Current Price: <strong>$${currentPrice.toFixed(2)}</strong> | You hold: <strong>${maxShares} shares</strong></p>
    </div>
    <div class="form-group">
      <label style="font-weight:700;color:var(--text-dim);font-size:0.85rem">Shares to Sell</label>
      <input type="number" id="sellShares" value="1" min="1" max="${maxShares}" class="filter-input" style="text-align:center;font-size:1.2rem;font-weight:700;margin-top:8px">
      <div style="margin-top:8px;text-align:center;color:var(--text-dim)">Revenue: <strong class="gradient-text" id="sellTotal">$${currentPrice.toFixed(2)}</strong></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-danger" style="flex:1;padding:14px" onclick="executeSell(${productId})"><i class="fas fa-arrow-down"></i> Sell</button>
      <button class="btn btn-secondary" style="flex:1;padding:14px" onclick="closeBuyModal()">Cancel</button>
    </div>
  `;
  document.getElementById('sellShares').addEventListener('input', (e) => {
    document.getElementById('sellTotal').textContent = '$' + ((parseInt(e.target.value) || 0) * currentPrice).toFixed(2);
  });
}

async function executeSell(productId) {
  const token = localStorage.getItem('token');
  const shares = parseInt(document.getElementById('sellShares').value);
  if (!shares || shares < 1) { showToast('Enter valid shares', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/invest/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId, shares })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    const emoji = data.pnl >= 0 ? '📈' : '📉';
    showToast(`${emoji} ${data.message} P&L: ${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}`, data.pnl >= 0 ? 'success' : 'warning');
    closeBuyModal();
    loadPortfolio();
    // Show invest receipt for sell
    const sellPrice = parseFloat(document.getElementById('sellTotal')?.textContent.replace('$','')) / shares || 0;
    showInvestReceipt('SELL', {
      productName: document.querySelector('#buyModalContent h2')?.textContent || 'Stock',
      shares: shares,
      pricePerShare: sellPrice,
      totalAmount: data.totalRevenue || 0,
      type: 'Sale',
      pnl: data.pnl
    });
  } catch(e) { showToast('Network error', 'error'); }
}

function closeBuyModal() { document.getElementById('buyModal').classList.remove('show'); }
document.getElementById('buyModal')?.addEventListener('click', e => { if (e.target.id === 'buyModal') closeBuyModal(); });

// === Toast ===
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

// === Investment Receipt ===
function showInvestReceipt(type, data) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
  const txnId = 'TXN-' + Date.now().toString(36).toUpperCase();
  const isBuy = type === 'BUY';
  const color = isBuy ? '#6c5ce7' : '#d63031';
  const pnlHtml = data.pnl !== undefined ? `<tr><td style="padding:10px 0;color:#666">Profit/Loss</td><td style="padding:10px 0;text-align:right;font-weight:700;color:${data.pnl >= 0 ? '#00b894' : '#d63031'}">${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}</td></tr>` : '';

  // Create receipt modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.style.zIndex = '9999';
  overlay.innerHTML = `
    <div class="modal glass-card" style="max-width:480px;padding:0;overflow:hidden;animation:modalIn 0.5s ease">
      <div style="background:linear-gradient(135deg,${color},${isBuy ? '#a29bfe' : '#e17055'});padding:30px;text-align:center;position:relative">
        <div style="width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;backdrop-filter:blur(10px)">
          <i class="fas fa-${isBuy ? 'arrow-trend-up' : 'arrow-trend-down'}" style="font-size:2rem;color:#fff"></i>
        </div>
        <h2 style="color:#fff;font-size:1.5rem;margin:0">Stock ${data.type} Receipt</h2>
        <p style="color:rgba(255,255,255,0.8);margin:5px 0 0;font-size:0.9rem">${txnId}</p>
      </div>
      <div style="padding:30px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;color:#666">Date</td><td style="padding:10px 0;text-align:right;color:#fff">${date}</td></tr>
          <tr><td style="padding:10px 0;color:#666">Trader</td><td style="padding:10px 0;text-align:right;color:#fff">${esc(user.username || 'N/A')}</td></tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.1)"><td style="padding:10px 0;color:#666">Stock</td><td style="padding:10px 0;text-align:right;color:#fff;font-weight:600">${esc(data.productName)}</td></tr>
          <tr><td style="padding:10px 0;color:#666">Transaction</td><td style="padding:10px 0;text-align:right"><span style="background:${color}20;color:${color};padding:4px 14px;border-radius:20px;font-weight:700;font-size:0.85rem">${type}</span></td></tr>
          <tr><td style="padding:10px 0;color:#666">Shares</td><td style="padding:10px 0;text-align:right;color:#fff;font-weight:700">${data.shares}</td></tr>
          <tr><td style="padding:10px 0;color:#666">Price/Share</td><td style="padding:10px 0;text-align:right;color:#fff">$${data.pricePerShare.toFixed(2)}</td></tr>
          ${pnlHtml}
          <tr style="border-top:2px solid rgba(255,255,255,0.1)"><td style="padding:15px 0;font-weight:700;font-size:1.1rem;color:#fff">Total Amount</td><td style="padding:15px 0;text-align:right;font-weight:800;font-size:1.3rem;background:linear-gradient(135deg,${color},${isBuy ? '#00cec9' : '#fdcb6e'});-webkit-background-clip:text;-webkit-text-fill-color:transparent">$${data.totalAmount.toFixed(2)}</td></tr>
        </table>
        <div style="display:flex;gap:10px;margin-top:25px">
          <button class="btn btn-primary btn-glow" style="flex:1" onclick="printInvestReceipt(this)"><i class="fas fa-download"></i> Download</button>
          <button class="btn btn-secondary" style="flex:1" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-times"></i> Close</button>
        </div>
      </div>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function printInvestReceipt(btn) {
  const modal = btn.closest('.modal');
  const printWin = window.open('', '_blank', 'width=600,height=700');
  printWin.document.write(`<!DOCTYPE html><html><head><title>StockMart - Investment Receipt</title><style>body{font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;color:#333;background:#fff}table{width:100%;border-collapse:collapse}td{padding:10px 0}.header{text-align:center;padding:25px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;border-radius:12px;margin-bottom:25px}@media print{body{padding:10px}.header{break-inside:avoid}}</style></head><body><div class="header"><h1 style="margin:0">📈 StockMart</h1><p style="margin:5px 0 0">Investment Receipt</p></div>${modal.querySelector('table').outerHTML}<p style="text-align:center;color:#888;margin-top:30px;font-size:12px">This is a computer-generated receipt from StockMart Investment Platform.</p></body></html>`);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => printWin.print(), 400);
}

// ===== IPO FUNCTIONS =====
let ipoData = { upcoming: [], active: [], closed: [] };

async function loadIPOs() {
  try {
    const res = await fetch(`${API}/api/invest/ipos`);
    ipoData = await res.json();
    document.getElementById('activeCount').textContent = ipoData.active.length;
    document.getElementById('upcomingCount').textContent = ipoData.upcoming.length;
    document.getElementById('closedCount').textContent = ipoData.closed.length;
    renderIpoGrid('activeIpoGrid', ipoData.active, 'active');
    renderIpoGrid('upcomingIpoGrid', ipoData.upcoming, 'upcoming');
    renderIpoGrid('closedIpoGrid', ipoData.closed, 'closed');
    if (localStorage.getItem('token')) loadMyIPOs();
  } catch(e) { console.error('IPO load error:', e); }
}

function renderIpoGrid(containerId, ipos, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (ipos.length === 0) {
    el.innerHTML = `<div class="ipo-empty"><i class="fas fa-inbox"></i><p>No ${type} IPOs right now</p></div>`;
    return;
  }
  el.innerHTML = ipos.map(ipo => {
    const isListed = ipo.status === 'listed';
    const listingGain = isListed && ipo.listing_price ? (((ipo.listing_price - ipo.price_band_high) / ipo.price_band_high) * 100).toFixed(1) : 0;
    const gmpPercent = ipo.gmp ? ((ipo.gmp / ipo.price_band_high) * 100).toFixed(1) : 0;
    const openDate = new Date(ipo.open_date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
    const closeDate = new Date(ipo.close_date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
    const listDate = new Date(ipo.listing_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});

    const statusBadge = {
      active: '<span class="ipo-badge ipo-badge-active"><i class="fas fa-circle-dot"></i> Live Now</span>',
      upcoming: '<span class="ipo-badge ipo-badge-upcoming"><i class="fas fa-clock"></i> Upcoming</span>',
      closed: '<span class="ipo-badge ipo-badge-closed"><i class="fas fa-lock"></i> Closed</span>',
      listed: '<span class="ipo-badge ipo-badge-listed"><i class="fas fa-check-double"></i> Listed</span>'
    };

    const totalSub = ((ipo.subscription_retail + ipo.subscription_hni + ipo.subscription_qib) / 3).toFixed(1);

    return `
      <div class="ipo-card glass-card slide-up">
        <div class="ipo-card-header">
          <img src="${ipo.logo_url}" class="ipo-logo" onerror="this.src='https://placehold.co/60/1a1a3e/6c5ce7?text=${esc(ipo.ticker)}'">
          <div class="ipo-card-title">
            <h3>${esc(ipo.company_name)}</h3>
            <span class="ipo-ticker">${esc(ipo.ticker)}</span>
            <span class="ipo-sector">${esc(ipo.sector)}</span>
          </div>
          ${statusBadge[ipo.status]}
        </div>
        <p class="ipo-desc">${esc(ipo.description)}</p>
        <div class="ipo-stats">
          <div class="ipo-stat">
            <span class="ipo-stat-label">Price Band</span>
            <span class="ipo-stat-value">$${ipo.price_band_low} - $${ipo.price_band_high}</span>
          </div>
          <div class="ipo-stat">
            <span class="ipo-stat-label">Lot Size</span>
            <span class="ipo-stat-value">${ipo.lot_size} shares</span>
          </div>
          <div class="ipo-stat">
            <span class="ipo-stat-label">Issue Size</span>
            <span class="ipo-stat-value">${esc(ipo.issue_size)}</span>
          </div>
          <div class="ipo-stat">
            <span class="ipo-stat-label">${isListed ? 'Listing Price' : 'GMP'}</span>
            <span class="ipo-stat-value ${isListed ? (listingGain > 0 ? 'text-success' : 'text-danger') : 'text-success'}">
              ${isListed ? '$' + ipo.listing_price + ' (' + (listingGain > 0 ? '+' : '') + listingGain + '%)' : '+$' + ipo.gmp + ' (' + gmpPercent + '%)'}
            </span>
          </div>
        </div>
        <div class="ipo-dates">
          <span><i class="fas fa-calendar-plus"></i> Open: ${openDate}</span>
          <span><i class="fas fa-calendar-minus"></i> Close: ${closeDate}</span>
          <span><i class="fas fa-calendar-check"></i> List: ${listDate}</span>
        </div>
        ${totalSub > 0 ? `
        <div class="ipo-subscription">
          <div class="ipo-sub-label">Subscription: <strong>${totalSub}x</strong></div>
          <div class="ipo-sub-bars">
            <div class="ipo-sub-bar"><span>Retail</span><div class="ipo-bar-track"><div class="ipo-bar-fill ipo-bar-retail" style="width:${Math.min(ipo.subscription_retail * 3, 100)}%"></div></div><span>${ipo.subscription_retail}x</span></div>
            <div class="ipo-sub-bar"><span>HNI</span><div class="ipo-bar-track"><div class="ipo-bar-fill ipo-bar-hni" style="width:${Math.min(ipo.subscription_hni * 2, 100)}%"></div></div><span>${ipo.subscription_hni}x</span></div>
            <div class="ipo-sub-bar"><span>QIB</span><div class="ipo-bar-track"><div class="ipo-bar-fill ipo-bar-qib" style="width:${Math.min(ipo.subscription_qib * 1.5, 100)}%"></div></div><span>${ipo.subscription_qib}x</span></div>
          </div>
        </div>` : ''}
        <div class="ipo-card-actions">
          ${ipo.status === 'active' ? `<button class="btn btn-primary btn-glow" onclick="openIpoModal(${ipo.id})"><i class="fas fa-paper-plane"></i> Apply Now</button>` : ''}
          ${ipo.status === 'upcoming' ? `<button class="btn btn-secondary" disabled><i class="fas fa-clock"></i> Opens ${openDate}</button>` : ''}
          ${isListed ? `<button class="btn btn-secondary" onclick="openBuyModal(${ipo.id})"><i class="fas fa-shopping-cart"></i> Buy Shares</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function switchIpoTab(tab) {
  document.querySelectorAll('.ipo-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.ipo-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.ipo-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('ipoTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  if (tab === 'myipos' && localStorage.getItem('token')) loadMyIPOs();
}

async function openIpoModal(ipoId) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  document.getElementById('ipoModal').classList.add('show');
  const content = document.getElementById('ipoModalContent');
  content.innerHTML = '<div style="text-align:center;padding:40px"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary)"></i></div>';

  try {
    const res = await fetch(`${API}/api/invest/ipos/${ipoId}`);
    const ipo = await res.json();
    if (!ipo || ipo.error) { content.innerHTML = '<p style="text-align:center;padding:40px;color:#888">IPO not found</p>'; return; }

    const minAmount = (ipo.lot_size * ipo.price_band_high).toFixed(2);

    content.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <img src="${ipo.logo_url}" style="width:70px;height:70px;border-radius:16px;object-fit:cover;margin-bottom:10px" onerror="this.src='https://placehold.co/70/1a1a3e/6c5ce7?text=${esc(ipo.ticker)}'">
        <h2 style="font-size:1.2rem;margin:5px 0">${esc(ipo.company_name)}</h2>
        <span class="ipo-ticker" style="font-size:0.9rem">${esc(ipo.ticker)}</span>
        <span class="ipo-sector" style="margin-left:8px">${esc(ipo.sector)}</span>
      </div>
      <div class="modal-stats-grid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="modal-stat"><div class="modal-stat-label">Price Band</div><div class="modal-stat-value">$${ipo.price_band_low}-${ipo.price_band_high}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">Lot Size</div><div class="modal-stat-value">${ipo.lot_size} shares</div></div>
        <div class="modal-stat"><div class="modal-stat-label">Issue Size</div><div class="modal-stat-value">${esc(ipo.issue_size)}</div></div>
      </div>
      <div class="modal-stats-grid" style="grid-template-columns:1fr 1fr;margin-top:10px">
        <div class="modal-stat"><div class="modal-stat-label">Applications</div><div class="modal-stat-value">${ipo.totalApplications || 0}</div></div>
        <div class="modal-stat"><div class="modal-stat-label">GMP</div><div class="modal-stat-value text-success">+$${ipo.gmp}</div></div>
      </div>
      <div class="form-group" style="margin-top:20px">
        <label style="font-weight:700;color:var(--text-dim);font-size:0.85rem">Number of Lots (max 15)</label>
        <div style="display:flex;gap:10px;align-items:center;margin-top:8px">
          <button class="btn btn-secondary btn-sm" onclick="adjustIpoLots(-1)">-</button>
          <input type="number" id="ipoLots" value="1" min="1" max="15" class="filter-input" style="flex:1;text-align:center;font-size:1.2rem;font-weight:700">
          <button class="btn btn-secondary btn-sm" onclick="adjustIpoLots(1)">+</button>
        </div>
        <div style="margin-top:10px;display:flex;justify-content:space-between;color:var(--text-dim);font-size:0.85rem">
          <span>Shares: <strong id="ipoShares">${ipo.lot_size}</strong></span>
          <span>Amount: <strong class="gradient-text" id="ipoAmount">$${minAmount}</strong></span>
        </div>
      </div>
      <div class="ipo-modal-info" style="margin-top:15px;padding:12px;background:rgba(108,92,231,0.1);border-radius:10px;font-size:0.82rem;color:var(--text-dim)">
        <i class="fas fa-info-circle" style="color:var(--primary)"></i> 
        Bid at cutoff price ($${ipo.price_band_high}). Amount will be blocked from your account. Allotment is lottery-based.
      </div>
      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-primary btn-glow" style="flex:1;padding:14px" onclick="applyIPO(${ipo.id}, ${ipo.lot_size}, ${ipo.price_band_high})">
          <i class="fas fa-paper-plane"></i> Apply for IPO
        </button>
        <button class="btn btn-secondary" style="flex:1;padding:14px" onclick="closeIpoModal()">Cancel</button>
      </div>
    `;

    document.getElementById('ipoLots').addEventListener('input', () => {
      updateIpoCalc(ipo.lot_size, ipo.price_band_high);
    });
  } catch(e) { content.innerHTML = '<p style="text-align:center;padding:40px;color:#888">Error loading IPO details</p>'; }
}

function adjustIpoLots(delta) {
  const inp = document.getElementById('ipoLots');
  let val = parseInt(inp.value) + delta;
  if (val < 1) val = 1;
  if (val > 15) val = 15;
  inp.value = val;
  inp.dispatchEvent(new Event('input'));
}

function updateIpoCalc(lotSize, price) {
  const lots = parseInt(document.getElementById('ipoLots').value) || 1;
  const shares = lots * lotSize;
  const amount = (shares * price).toFixed(2);
  document.getElementById('ipoShares').textContent = shares;
  document.getElementById('ipoAmount').textContent = '$' + amount;
}

async function applyIPO(ipoId, lotSize, price) {
  const token = localStorage.getItem('token');
  const lots = parseInt(document.getElementById('ipoLots').value);
  if (!lots || lots < 1 || lots > 15) { showToast('Enter 1-15 lots', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/invest/ipos/${ipoId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ lots })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast(`🎉 ${data.message}`, 'success');
    closeIpoModal();
    loadIPOs();
    // Show IPO receipt
    showIpoReceipt(data.application, ipoId);
  } catch(e) { showToast('Network error', 'error'); }
}

function showIpoReceipt(app, ipoId) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const ipo = [...ipoData.active, ...ipoData.upcoming].find(i => i.id === ipoId);
  const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
  const appId = 'IPO-' + Date.now().toString(36).toUpperCase();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.style.zIndex = '9999';
  overlay.innerHTML = `
    <div class="modal glass-card" style="max-width:480px;padding:0;overflow:hidden;animation:modalIn 0.5s ease">
      <div style="background:linear-gradient(135deg,#6c5ce7,#00cec9);padding:30px;text-align:center">
        <div style="width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;backdrop-filter:blur(10px)">
          <i class="fas fa-rocket" style="font-size:2rem;color:#fff"></i>
        </div>
        <h2 style="color:#fff;font-size:1.5rem;margin:0">IPO Application Receipt</h2>
        <p style="color:rgba(255,255,255,0.8);margin:5px 0 0;font-size:0.9rem">${appId}</p>
      </div>
      <div style="padding:30px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;color:#666">Date</td><td style="padding:10px 0;text-align:right;color:#fff">${date}</td></tr>
          <tr><td style="padding:10px 0;color:#666">Applicant</td><td style="padding:10px 0;text-align:right;color:#fff">${esc(user.username || 'N/A')}</td></tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.1)"><td style="padding:10px 0;color:#666">Company</td><td style="padding:10px 0;text-align:right;color:#fff;font-weight:600">${ipo ? esc(ipo.company_name) : 'IPO'}</td></tr>
          <tr><td style="padding:10px 0;color:#666">Lots</td><td style="padding:10px 0;text-align:right;color:#fff;font-weight:700">${app.lots}</td></tr>
          <tr><td style="padding:10px 0;color:#666">Shares</td><td style="padding:10px 0;text-align:right;color:#fff">${app.shares}</td></tr>
          <tr><td style="padding:10px 0;color:#666">Bid Price</td><td style="padding:10px 0;text-align:right;color:#fff">$${app.totalAmount ? (app.totalAmount / app.shares).toFixed(2) : '0'}</td></tr>
          <tr><td style="padding:10px 0;color:#666">Status</td><td style="padding:10px 0;text-align:right"><span style="background:rgba(108,92,231,0.2);color:#a29bfe;padding:4px 14px;border-radius:20px;font-weight:700;font-size:0.85rem">APPLIED</span></td></tr>
          <tr style="border-top:2px solid rgba(255,255,255,0.1)"><td style="padding:15px 0;font-weight:700;font-size:1.1rem;color:#fff">Total Blocked</td><td style="padding:15px 0;text-align:right;font-weight:800;font-size:1.3rem;background:linear-gradient(135deg,#6c5ce7,#00cec9);-webkit-background-clip:text;-webkit-text-fill-color:transparent">$${app.totalAmount.toFixed(2)}</td></tr>
        </table>
        <div style="display:flex;gap:10px;margin-top:25px">
          <button class="btn btn-primary btn-glow" style="flex:1" onclick="this.closest('.modal-overlay').remove()"><i class="fas fa-check"></i> Done</button>
        </div>
      </div>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

async function loadMyIPOs() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const el = document.getElementById('myIpoApps');
  try {
    const res = await fetch(`${API}/api/invest/my-ipos`, { headers: { 'Authorization': `Bearer ${token}` } });
    const apps = await res.json();
    if (apps.length === 0) {
      el.innerHTML = '<div class="ipo-empty"><i class="fas fa-folder-open"></i><p>No IPO applications yet. Apply for an active IPO!</p></div>';
      return;
    }
    el.innerHTML = `<div class="ipo-apps-list">${apps.map(app => {
      const statusClass = { applied: 'ipo-status-applied', allotted: 'ipo-status-allotted', rejected: 'ipo-status-rejected' };
      return `
        <div class="ipo-app-card glass-card fade-in">
          <div class="ipo-app-header">
            <img src="${app.logo_url}" class="ipo-app-logo" onerror="this.src='https://placehold.co/45/1a1a3e/6c5ce7?text=IPO'">
            <div>
              <div style="font-weight:700;font-size:1rem">${esc(app.company_name)}</div>
              <div style="font-size:0.8rem;color:var(--text-dim)">Applied ${new Date(app.applied_at).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}</div>
            </div>
            <span class="ipo-app-status ${statusClass[app.status] || ''}">${app.status.toUpperCase()}</span>
          </div>
          <div class="ipo-app-details">
            <span>Lots: <strong>${app.lots}</strong></span>
            <span>Shares: <strong>${app.shares}</strong></span>
            <span>Amount: <strong>$${app.total_amount.toFixed(2)}</strong></span>
          </div>
          ${app.status === 'applied' ? `<button class="btn btn-danger btn-sm" style="margin-top:10px" onclick="withdrawIPO(${app.ipo_id})"><i class="fas fa-times"></i> Withdraw</button>` : ''}
        </div>`;
    }).join('')}</div>`;
  } catch(e) { el.innerHTML = '<p style="text-align:center;color:#888">Error loading applications</p>'; }
}

async function withdrawIPO(ipoId) {
  if (!confirm('Withdraw your IPO application?')) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/invest/ipos/${ipoId}/withdraw`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error, 'error'); return; }
    showToast('IPO application withdrawn', 'success');
    loadMyIPOs();
    loadIPOs();
  } catch(e) { showToast('Network error', 'error'); }
}

function closeIpoModal() { document.getElementById('ipoModal').classList.remove('show'); }
document.getElementById('ipoModal')?.addEventListener('click', e => { if (e.target.id === 'ipoModal') closeIpoModal(); });

function esc(text) { if (!text) return ''; const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
