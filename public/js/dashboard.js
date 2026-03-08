// ===== StockMart - Dashboard JS =====
const API = '';
let dashPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  setEl('adminName', user.username);

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('show');
    });
  }

  loadDashboard();
  loadDashProducts();
  loadDashCategories();
});

async function loadDashboard() {
  const token = localStorage.getItem('token');
  try {
    const [overviewRes, categoriesRes, statsRes] = await Promise.all([
      fetch(`${API}/api/analytics/overview`),
      fetch(`${API}/api/products/categories`),
      fetch(`${API}/api/orders/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
    ]);

    const overview = await overviewRes.json();
    const categories = await categoriesRes.json();
    let orderStats = { totalRevenue: 0, totalOrders: 0, totalUsers: 0, pendingOrders: 0, last7: [], topProducts: [] };
    if (statsRes && statsRes.ok) orderStats = await statsRes.json();

    setEl('dashTotalProducts', overview.totalProducts);
    setEl('dashTotalUsers', orderStats.totalUsers);
    setEl('dashTotalOrders', orderStats.totalOrders);
    setEl('dashRevenue', formatCurrency(orderStats.totalRevenue));
    setEl('dashPending', orderStats.pendingOrders);
    setEl('dashAvgChange', (overview.avgChange > 0 ? '+' : '') + overview.avgChange.toFixed(2) + '%');

    createCategoryChart(categories);
    createRevenueChart(orderStats.last7);
    createOrdersChart(orderStats.last7);
    createTopProductsChart(orderStats.topProducts);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// === Tab Switching ===
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => {
    t.style.display = 'none';
    t.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tab = document.getElementById('tab-' + tabName);
  if (tab) {
    tab.style.display = 'block';
    tab.classList.add('active');
  }
  // Find and activate the correct tab button
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.textContent.toLowerCase().includes(tabName === 'overview' ? 'overview' : tabName)) {
      btn.classList.add('active');
    }
  });

  if (tabName === 'orders') loadAdminOrders();
  if (tabName === 'activities') loadActivities();
  if (tabName === 'ipos') loadIpoApplications();
}

// === Charts ===
const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#0984e3', '#d63031', '#e17055', '#00b894'];

function createCategoryChart(categories) {
  const ctx = document.getElementById('dashCategoryChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories.map(c => c.category),
      datasets: [{ data: categories.map(c => c.count), backgroundColor: colors, borderColor: '#0a0a1a', borderWidth: 3, hoverOffset: 15 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#8888aa', padding: 15, usePointStyle: true } } }
    }
  });
}

function createRevenueChart(last7) {
  const ctx = document.getElementById('dashRevenueChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: (last7 || []).map(d => d.date.split('-').slice(1).join('/')),
      datasets: [{
        label: 'Revenue ($)',
        data: (last7 || []).map(d => d.revenue.toFixed(2)),
        backgroundColor: 'rgba(108, 92, 231, 0.6)', borderColor: '#6c5ce7', borderWidth: 2, borderRadius: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8888aa' } } },
      scales: { x: { ticks: { color: '#8888aa' }, grid: { display: false } }, y: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
    }
  });
}

function createOrdersChart(last7) {
  const ctx = document.getElementById('dashOrdersChart');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: (last7 || []).map(d => d.date.split('-').slice(1).join('/')),
      datasets: [{
        label: 'Orders',
        data: (last7 || []).map(d => d.count),
        borderColor: '#00cec9', backgroundColor: 'rgba(0,206,201,0.1)', fill: true, tension: 0.4, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#00cec9'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8888aa' } } },
      scales: { x: { ticks: { color: '#8888aa' }, grid: { display: false } }, y: { ticks: { color: '#8888aa', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } } }
    }
  });
}

function createTopProductsChart(topProducts) {
  const ctx = document.getElementById('dashTopProducts');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: (topProducts || []).map(p => p.name.substring(0, 20)),
      datasets: [{
        label: 'Orders',
        data: (topProducts || []).map(p => p.count),
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1, borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#8888aa', font: { size: 10 } }, grid: { display: false } } }
    }
  });
}

// === Admin Orders ===
async function loadAdminOrders() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/orders/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } });
    const orders = await res.json();
    const container = document.getElementById('adminOrdersList');

    if (orders.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#888">No orders yet</p>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr><th>ID</th><th>User</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${orders.map(o => {
            const date = new Date(o.created_at).toLocaleDateString('en', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
            return `<tr>
              <td>#${o.id}</td>
              <td>${escapeHtml(o.username)}</td>
              <td>${o.item_count} items</td>
              <td class="gradient-text" style="font-weight:700">$${o.grandTotal.toFixed(2)}</td>
              <td>${(o.paymentMethod || 'cod').toUpperCase()}</td>
              <td>
                <select class="filter-select status-select" onchange="updateOrderStatus(${o.id}, this.value)" style="padding:5px 10px;font-size:12px">
                  ${['confirmed','processing','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
                </select>
              </td>
              <td style="font-size:12px">${date}</td>
              <td><button class="action-btn edit" onclick="viewDashOrder(${o.id})"><i class="fas fa-eye"></i></button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch(e) { console.error(e); }
}

async function updateOrderStatus(orderId, status) {
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API}/api/orders/admin/status/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
  } catch(e) { alert('Error updating status'); }
}

async function viewDashOrder(id) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/orders/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const order = await res.json();
    const date = new Date(order.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const statusColors = { confirmed:'#0984e3', processing:'#fdcb6e', shipped:'#00cec9', delivered:'#00b894', cancelled:'#d63031' };
    const sc = statusColors[order.status] || '#6c5ce7';

    document.getElementById('dashOrderDetail').innerHTML = `
      <h2 class="gradient-text" style="margin-bottom:20px"><i class="fas fa-receipt"></i> Order #${order.id}</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <div class="glass-card" style="padding:15px">
          <h4 style="color:var(--primary-light);margin-bottom:10px"><i class="fas fa-info-circle"></i> Order Info</h4>
          <p style="margin:5px 0;color:var(--text-dim)"><strong style="color:#fff">Date:</strong> ${date}</p>
          <p style="margin:5px 0;color:var(--text-dim)"><strong style="color:#fff">Status:</strong> <span style="background:${sc}20;color:${sc};padding:3px 12px;border-radius:12px;font-size:0.8rem;font-weight:700">${order.status.toUpperCase()}</span></p>
          <p style="margin:5px 0;color:var(--text-dim)"><strong style="color:#fff">Payment:</strong> ${(order.paymentMethod || 'cod').toUpperCase()}</p>
          ${order.paymentDetails ? `<p style="margin:5px 0;color:var(--text-dim)"><strong style="color:#fff">Details:</strong> ${escapeHtml(order.paymentDetails)}</p>` : ''}
        </div>
        <div class="glass-card" style="padding:15px">
          <h4 style="color:var(--primary-light);margin-bottom:10px"><i class="fas fa-map-marker-alt"></i> Shipping Address</h4>
          <p style="margin:5px 0;font-weight:700">${escapeHtml(order.fullName)}</p>
          <p style="margin:5px 0;color:var(--text-dim)">${escapeHtml(order.address)}</p>
          <p style="margin:5px 0;color:var(--text-dim)">${escapeHtml(order.city)}, ${escapeHtml(order.state)} - ${escapeHtml(order.pincode)}</p>
          <p style="margin:5px 0;color:var(--text-dim)"><i class="fas fa-phone"></i> ${escapeHtml(order.phone)}</p>
          <p style="margin:5px 0;color:var(--text-dim)"><i class="fas fa-envelope"></i> ${escapeHtml(order.email)}</p>
        </div>
      </div>
      <h4 style="margin-bottom:10px"><i class="fas fa-box"></i> Items (${order.items?.length || 0})</h4>
      <div style="max-height:250px;overflow-y:auto;margin-bottom:15px">
        ${(order.items || []).map(item => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px;border-bottom:1px solid rgba(255,255,255,0.05)">
            <img src="${item.image_url}" style="width:45px;height:45px;border-radius:8px;object-fit:cover" onerror="this.src='https://placehold.co/45/1a1a3e/6c5ce7?text=P'">
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.9rem">${escapeHtml(item.name)}</div>
              <div style="font-size:0.8rem;color:var(--text-dim)">${escapeHtml(item.category)} &middot; Qty: ${item.quantity}</div>
            </div>
            <div style="font-weight:700;color:var(--primary-light)">$${item.total.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
      <div class="glass-card" style="padding:15px">
        <div style="display:flex;justify-content:space-between;margin:4px 0;color:var(--text-dim)"><span>Subtotal</span><span>$${order.subtotal.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;margin:4px 0;color:var(--text-dim)"><span>Tax (18% GST)</span><span>$${order.tax.toFixed(2)}</span></div>
        <div style="display:flex;justify-content:space-between;margin:4px 0;color:var(--text-dim)"><span>Shipping</span><span>${order.shipping === 0 ? 'FREE' : '$' + order.shipping.toFixed(2)}</span></div>
        <div style="border-top:2px solid rgba(255,255,255,0.1);margin:10px 0;padding-top:10px;display:flex;justify-content:space-between;font-size:1.2rem;font-weight:800">
          <span>Grand Total</span><span class="gradient-text">$${order.grandTotal.toFixed(2)}</span>
        </div>
      </div>
    `;
    document.getElementById('dashOrderModal').classList.add('show');
  } catch(e) { console.error('Error viewing order:', e); }
}

function closeDashOrderModal() {
  document.getElementById('dashOrderModal').classList.remove('show');
}
document.getElementById('dashOrderModal')?.addEventListener('click', e => {
  if (e.target.id === 'dashOrderModal') closeDashOrderModal();
});

// === Activities ===
async function loadActivities() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/orders/admin/activities`, { headers: { 'Authorization': `Bearer ${token}` } });
    const activities = await res.json();
    const container = document.getElementById('activitiesList');

    if (activities.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#888">No activities yet</p>';
      return;
    }

    const actionIcons = {
      login: 'fas fa-sign-in-alt', register: 'fas fa-user-plus', add_to_cart: 'fas fa-cart-plus',
      place_order: 'fas fa-receipt', update_order_status: 'fas fa-edit'
    };
    const actionColors = {
      login: '#0984e3', register: '#00b894', add_to_cart: '#6c5ce7',
      place_order: '#fdcb6e', update_order_status: '#00cec9'
    };

    container.innerHTML = `
      <div class="activity-timeline">
        ${activities.map(a => {
          const icon = actionIcons[a.action] || 'fas fa-circle';
          const color = actionColors[a.action] || '#6c5ce7';
          const time = new Date(a.created_at).toLocaleDateString('en', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
          return `
            <div class="activity-item fade-in">
              <div class="activity-icon" style="background:${color}20;color:${color}"><i class="${icon}"></i></div>
              <div class="activity-content">
                <div class="activity-user"><strong>${escapeHtml(a.username)}</strong></div>
                <div class="activity-details">${escapeHtml(a.details)}</div>
                <div class="activity-time"><i class="fas fa-clock"></i> ${time}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch(e) { console.error(e); }
}

// === Product Management ===
async function loadDashProducts() {
  const search = document.getElementById('dashSearch')?.value || '';
  const category = document.getElementById('dashCategory')?.value || '';
  try {
    const url = `${API}/api/products?page=${dashPage}&limit=15&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
    const res = await fetch(url);
    const data = await res.json();
    const body = document.getElementById('dashProductsBody');
    if (!body) return;
    body.innerHTML = data.products.map(p => {
      const cls = p.stock_change_percent >= 0 ? 'positive' : 'negative';
      return `<tr>
        <td>${p.id}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category)}</td>
        <td>$${p.price.toFixed(2)}</td>
        <td>$${p.stock_price.toFixed(2)}</td>
        <td class="${cls}">${p.stock_change_percent > 0 ? '+' : ''}${p.stock_change_percent.toFixed(2)}%</td>
        <td>${p.rating.toFixed(1)} ⭐</td>
        <td>
          <button class="action-btn edit" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
    renderDashPagination(data.pagination);
  } catch (err) { console.error('Error:', err); }
}

function renderDashPagination(pagination) {
  const container = document.getElementById('dashPagination');
  if (!container) return;
  const { page, totalPages } = pagination;
  let html = '';
  if (page > 1) html += `<button class="page-btn" onclick="dashGoToPage(${page - 1})">‹</button>`;
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="dashGoToPage(${i})">${i}</button>`;
  }
  if (page < totalPages) html += `<button class="page-btn" onclick="dashGoToPage(${page + 1})">›</button>`;
  container.innerHTML = html;
}

function dashGoToPage(page) { dashPage = page; loadDashProducts(); }

async function loadDashCategories() {
  try {
    const res = await fetch(`${API}/api/products/categories`);
    const categories = await res.json();
    const select = document.getElementById('dashCategory');
    if (!select) return;
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.category;
      opt.textContent = c.category;
      select.appendChild(opt);
    });
  } catch (err) {}
}

function searchDashProducts() { dashPage = 1; loadDashProducts(); }
function filterDashProducts() { dashPage = 1; loadDashProducts(); }

function showAddProduct() {
  document.getElementById('productForm')?.classList.remove('hidden');
  document.getElementById('formTitle').textContent = 'Add New Product';
  document.getElementById('addProductForm')?.reset();
  document.getElementById('editProductId').value = '';
}
function hideAddProduct() { document.getElementById('productForm')?.classList.add('hidden'); }

async function editProduct(id) {
  try {
    const res = await fetch(`${API}/api/products/${id}`);
    const product = await res.json();
    document.getElementById('productForm')?.classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Edit Product';
    document.getElementById('editProductId').value = id;
    document.getElementById('prodName').value = product.name;
    document.getElementById('prodCategory').value = product.category;
    document.getElementById('prodPrice').value = product.price;
    document.getElementById('prodStockPrice').value = product.stock_price;
    document.getElementById('prodDescription').value = product.description || '';
    switchTab('products');
  } catch (err) { alert('Error loading product'); }
}

document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const id = document.getElementById('editProductId').value;
  const data = {
    name: document.getElementById('prodName').value,
    category: document.getElementById('prodCategory').value,
    price: parseFloat(document.getElementById('prodPrice').value),
    stock_price: parseFloat(document.getElementById('prodStockPrice').value) || 0,
    description: document.getElementById('prodDescription').value
  };
  try {
    const url = id ? `${API}/api/products/${id}` : `${API}/api/products`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) { alert(result.error || 'Error'); return; }
    hideAddProduct();
    loadDashProducts();
  } catch (err) { alert('Error saving product'); }
});

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const token = localStorage.getItem('token');
  try {
    await fetch(`${API}/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    loadDashProducts();
  } catch (err) { alert('Error'); }
}

// === IPO Applications ===
async function loadIpoApplications() {
  const token = localStorage.getItem('token');
  const container = document.getElementById('ipoApplicationsList');
  if (!container) return;
  container.innerHTML = '<p style="text-align:center;padding:40px;color:#888"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
  try {
    const res = await fetch(`${API}/api/invest/admin/applications`, { headers: { 'Authorization': `Bearer ${token}` } });
    const apps = await res.json();
    if (!Array.isArray(apps) || apps.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:40px;color:#888">No IPO applications yet</p>';
      return;
    }
    const totalAmount = apps.reduce((s, a) => s + (a.total_amount || 0), 0);
    container.innerHTML = `
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px">
        <div class="glass-card" style="padding:15px 25px;flex:1;min-width:150px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:#6c5ce7">${apps.length}</div>
          <div style="color:#8888aa;font-size:0.85rem">Total Applications</div>
        </div>
        <div class="glass-card" style="padding:15px 25px;flex:1;min-width:150px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:#00cec9">&#x20b9;${totalAmount.toLocaleString()}</div>
          <div style="color:#8888aa;font-size:0.85rem">Total Bid Amount</div>
        </div>
        <div class="glass-card" style="padding:15px 25px;flex:1;min-width:150px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:#fd79a8">${[...new Set(apps.map(a=>a.company_name))].length}</div>
          <div style="color:#8888aa;font-size:0.85rem">IPOs Applied</div>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th><th>User</th><th>Email</th><th>Company</th><th>Ticker</th>
              <th>Lots</th><th>Shares</th><th>Bid Price</th><th>Total Amount</th><th>Status</th><th>Applied On</th>
            </tr>
          </thead>
          <tbody>
            ${apps.map((a, i) => {
              const date = new Date(a.applied_at).toLocaleDateString('en', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
              const statusColor = a.status === 'applied' ? '#00cec9' : a.status === 'allotted' ? '#00b894' : '#d63031';
              return `<tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(a.username)}</strong></td>
                <td style="font-size:0.8rem;color:#8888aa">${escapeHtml(a.email)}</td>
                <td>${escapeHtml(a.company_name)}</td>
                <td><span style="background:#6c5ce720;color:#6c5ce7;padding:2px 8px;border-radius:6px;font-weight:700">${escapeHtml(a.ticker)}</span></td>
                <td style="text-align:center">${a.lots}</td>
                <td style="text-align:center">${a.shares}</td>
                <td>&#x20b9;${a.bid_price}</td>
                <td style="font-weight:700;color:#fdcb6e">&#x20b9;${(a.total_amount||0).toLocaleString()}</td>
                <td><span style="background:${statusColor}20;color:${statusColor};padding:3px 10px;border-radius:10px;font-size:0.8rem;font-weight:700">${a.status.toUpperCase()}</span></td>
                <td style="font-size:0.8rem;color:#8888aa">${date}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(e) { container.innerHTML = '<p style="text-align:center;padding:40px;color:#d63031">Error loading IPO applications</p>'; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  fetch(`${API}/api/auth/logout`, { method: 'POST' });
  window.location.href = 'login.html';
}

function formatCurrency(num) {
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
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
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
