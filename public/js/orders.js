// ===== StockMart - Orders JS =====
const API = '';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  const token = localStorage.getItem('token');
  if (!token) {
    document.getElementById('loginRequired').style.display = 'block';
    return;
  }
  document.getElementById('ordersContent').style.display = 'block';
  loadOrders();

  // Show fireworks + toast if arriving from a successful checkout
  const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || 'null');
  if (lastOrder && Date.now() - lastOrder.timestamp < 60000) {
    localStorage.removeItem('lastOrder');
    setTimeout(() => {
      launchFireworks();
      showToast(`🎉 Order #${lastOrder.id} placed! Total: $${Number(lastOrder.grandTotal).toFixed(2)}`, 'success');
    }, 600);
  }
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
    const res = await fetch(`${API}/api/cart/count`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    badge.textContent = data.count || 0;
    badge.style.display = data.count > 0 ? 'inline-flex' : 'none';
  } catch(e) {}
}

async function loadOrders() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/orders/my-orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const orders = await res.json();

    if (orders.length === 0) {
      document.getElementById('emptyOrders').style.display = 'block';
      return;
    }

    const container = document.getElementById('ordersList');
    container.innerHTML = orders.map(order => {
      const statusColors = {
        confirmed: '#0984e3', processing: '#fdcb6e', shipped: '#00cec9',
        delivered: '#00b894', cancelled: '#d63031'
      };
      const statusColor = statusColors[order.status] || '#6c5ce7';
      const date = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="order-card glass-card fade-in" onclick="viewOrder(${order.id})">
          <div class="order-card-header">
            <div class="order-id">
              <i class="fas fa-receipt"></i> Order #${order.id}
            </div>
            <span class="order-status" style="background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40">
              <i class="fas fa-circle" style="font-size:8px"></i> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <div class="order-card-body">
            <div class="order-info-row">
              <span><i class="fas fa-calendar"></i> ${date}</span>
              <span><i class="fas fa-box"></i> ${order.item_count} items</span>
              <span><i class="fas fa-credit-card"></i> ${order.paymentMethod?.toUpperCase() || 'COD'}</span>
            </div>
            <div class="order-items-preview">
              ${(order.items || []).slice(0, 3).map(item => `
                <div class="order-item-mini">
                  <img src="${item.image_url}" alt="" class="order-item-mini-img" onerror="this.src='https://placehold.co/40x40/1a1a3e/6c5ce7?text=P'">
                  <span>${escapeHtml(item.name?.substring(0, 30) || '')}${item.name?.length > 30 ? '...' : ''}</span>
                  <span>x${item.quantity}</span>
                </div>
              `).join('')}
              ${(order.items || []).length > 3 ? `<div class="order-more">+${order.items.length - 3} more items</div>` : ''}
            </div>
            ${getOrderTrackingTimeline(order)}
          </div>
          <div class="order-card-footer">
            <span class="order-total gradient-text">Total: $${order.grandTotal.toFixed(2)}</span>
            <div class="order-card-actions">
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();viewOrder(${order.id})"><i class="fas fa-eye"></i> View</button>
              <button class="btn btn-download-receipt btn-sm" onclick="event.stopPropagation();downloadOrderReceipt(${order.id})"><i class="fas fa-download"></i> Receipt</button>
              <button class="btn btn-reorder btn-sm" onclick="event.stopPropagation();reorderItems(${order.id})"><i class="fas fa-redo"></i> Reorder</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch(e) {
    console.error('Error loading orders:', e);
  }
}

async function viewOrder(id) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/orders/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const order = await res.json();
    
    const date = new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const detail = document.getElementById('orderDetail');
    detail.innerHTML = `
      <h2 class="gradient-text" style="margin-bottom:20px"><i class="fas fa-receipt"></i> Order #${order.id}</h2>
      
      <div class="order-detail-grid">
        <div class="order-detail-section">
          <h4><i class="fas fa-info-circle"></i> Order Info</h4>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Status:</strong> <span class="order-status-tag">${order.status}</span></p>
          <p><strong>Payment:</strong> ${order.paymentMethod?.toUpperCase() || 'COD'}</p>
          ${order.paymentDetails ? `<p><strong>Details:</strong> ${escapeHtml(order.paymentDetails)}</p>` : ''}
        </div>
        <div class="order-detail-section">
          <h4><i class="fas fa-map-marker-alt"></i> Shipping Address</h4>
          <p><strong>${escapeHtml(order.fullName)}</strong></p>
          <p>${escapeHtml(order.address)}</p>
          <p>${escapeHtml(order.city)}, ${escapeHtml(order.state)} - ${escapeHtml(order.pincode)}</p>
          <p><i class="fas fa-phone"></i> ${escapeHtml(order.phone)}</p>
          <p><i class="fas fa-envelope"></i> ${escapeHtml(order.email)}</p>
        </div>
      </div>

      <h4 style="margin:20px 0 10px"><i class="fas fa-box"></i> Items</h4>
      <div class="order-detail-items">
        ${(order.items || []).map(item => `
          <div class="order-detail-item">
            <img src="${item.image_url}" alt="" class="order-detail-item-img" onerror="this.src='https://placehold.co/60x60/1a1a3e/6c5ce7?text=P'">
            <div class="order-detail-item-info">
              <div class="order-detail-item-name">${escapeHtml(item.name)}</div>
              <div class="order-detail-item-cat">${escapeHtml(item.category)}</div>
            </div>
            <div class="order-detail-item-qty">x${item.quantity}</div>
            <div class="order-detail-item-price">$${item.total.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>

      <div class="order-detail-totals">
        <div class="summary-row"><span>Subtotal</span><span>$${order.subtotal.toFixed(2)}</span></div>
        <div class="summary-row"><span>Tax (18% GST)</span><span>$${order.tax.toFixed(2)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${order.shipping === 0 ? 'FREE' : '$' + order.shipping.toFixed(2)}</span></div>
        <div class="summary-divider"></div>
        <div class="summary-row summary-total"><span>Grand Total</span><span class="gradient-text">$${order.grandTotal.toFixed(2)}</span></div>
      </div>

      ${getOrderTrackingTimeline(order, true)}

      <div style="text-align:center;margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button onclick="downloadOrderReceipt(${order.id})" class="btn btn-primary btn-glow"><i class="fas fa-download"></i> Download Receipt</button>
        <button onclick="printOrderDirect(${order.id})" class="btn btn-secondary"><i class="fas fa-print"></i> Print</button>
      </div>
    `;

    document.getElementById('orderModal').classList.add('show');
  } catch(e) {
    console.error('Error:', e);
  }
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('show');
}

document.getElementById('orderModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') closeOrderModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeOrderModal();
});

async function downloadOrderReceipt(orderId) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  try {
    showToast('Loading receipt...', 'info');
    const res = await fetch(`${API}/api/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed');
    const order = await res.json();
    window._receiptOrder = order;

    // Build dark-themed in-page preview
    const previewEl = document.getElementById('receiptPreview');
    if (previewEl) {
      const date = new Date(order.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
      const time = new Date(order.created_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
      const statusClass = `receipt-status-${order.status}`;
      const itemsHtml = (order.items || []).map((item, i) => `
        <tr class="receipt-item-row">
          <td>${i+1}</td>
          <td>${escapeHtml(item.name)}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">$${Number(item.price).toFixed(2)}</td>
          <td class="right">$${Number(item.total).toFixed(2)}</td>
        </tr>`).join('');

      previewEl.innerHTML = `
        <div class="receipt-card">
          <div class="receipt-brand">
            <div class="receipt-logo"><i class="fas fa-chart-line"></i></div>
            <h3>StockMart</h3>
            <span class="receipt-badge">INVOICE</span>
          </div>
          <div class="receipt-info-grid">
            <div class="receipt-info-block">
              <h4><i class="fas fa-user"></i> Bill To</h4>
              <p class="receipt-name">${escapeHtml(order.fullName)}</p>
              <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(order.address)}</p>
              <p>${escapeHtml(order.city)}, ${escapeHtml(order.state)} &minus; ${escapeHtml(order.pincode)}</p>
              <p><i class="fas fa-phone"></i> ${escapeHtml(order.phone)}</p>
              <p><i class="fas fa-envelope"></i> ${escapeHtml(order.email)}</p>
            </div>
            <div class="receipt-info-block right-align">
              <h4><i class="fas fa-receipt"></i> Order Details</h4>
              <p class="receipt-order-id">Order #${order.id}</p>
              <p><i class="fas fa-calendar"></i> ${date}</p>
              <p><i class="fas fa-clock"></i> ${time}</p>
              <p><span class="receipt-status ${statusClass}">${(order.status||'').toUpperCase()}</span></p>
              <p><i class="fas fa-credit-card"></i> ${(order.paymentMethod||'COD').toUpperCase()}</p>
              ${order.paymentDetails ? `<p style="font-size:0.75rem;opacity:0.7">${escapeHtml(order.paymentDetails)}</p>` : ''}
            </div>
          </div>
          <div class="receipt-items-table">
            <table>
              <thead><tr>
                <th style="width:40px">#</th>
                <th>Product</th>
                <th class="center" style="width:60px">Qty</th>
                <th class="right" style="width:80px">Price</th>
                <th class="right" style="width:90px">Total</th>
              </tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
          <div class="receipt-totals">
            <div class="receipt-total-row"><span>Subtotal</span><span>$${Number(order.subtotal).toFixed(2)}</span></div>
            <div class="receipt-total-row"><span>Tax (18% GST)</span><span>$${Number(order.tax).toFixed(2)}</span></div>
            <div class="receipt-total-row"><span>Shipping</span><span>${order.shipping === 0 ? '<span style="color:#00b894">FREE</span>' : '$'+Number(order.shipping).toFixed(2)}</span></div>
            <div class="receipt-total-row receipt-grand-total"><span>Grand Total</span><span>$${Number(order.grandTotal).toFixed(2)}</span></div>
          </div>
          <div class="receipt-footer-note">
            <i class="fas fa-heart"></i> Thank you for shopping with StockMart!<br>
            <small>admin@stockmart.com &bull; +91 98765 43210 &bull; Computer-generated invoice</small>
          </div>
        </div>`;
    }
    document.getElementById('receiptModal').classList.add('show');
  } catch(e) {
    // Fallback: direct server download
    window.location.href = `/api/orders/download/${orderId}?token=${encodeURIComponent(token)}`;
  }
}

function closeReceiptModal() {
  document.getElementById('receiptModal').classList.remove('show');
  window._receiptOrder = null;
}

document.getElementById('receiptModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'receiptModal') closeReceiptModal();
});

function buildReceiptHtmlFile(order) {
  const date = new Date(order.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const time = new Date(order.created_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  let itemsHtml = (order.items || []).map((item, i) =>
    `<tr><td style="padding:10px 12px;border-bottom:1px solid #eee">${i+1}</td><td style="padding:10px 12px;border-bottom:1px solid #eee">${item.name}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">$${item.price.toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">$${item.total.toFixed(2)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>StockMart Receipt #${order.id}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px 30px;color:#333;background:#fafafa}
.header{text-align:center;padding-bottom:25px;margin-bottom:30px;border-bottom:3px solid #6c5ce7;position:relative}
.header::after{content:'';position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:60px;height:3px;background:#00cec9}
.header h1{color:#6c5ce7;font-size:32px;letter-spacing:2px}
.header .subtitle{color:#888;margin:5px 0;font-size:14px}
.header .invoice-label{display:inline-block;margin-top:12px;padding:6px 24px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;border-radius:20px;font-weight:700;font-size:14px;letter-spacing:3px}
.info-grid{display:flex;justify-content:space-between;margin-bottom:30px;gap:20px}
.info-box{flex:1;padding:20px;background:#f8f9fa;border-radius:12px;border:1px solid #eef}
.info-box h3{color:#6c5ce7;font-size:12px;margin-bottom:10px;text-transform:uppercase;letter-spacing:2px}
.info-box p{margin:4px 0;font-size:13px;color:#555}
.info-box .name{font-size:16px;font-weight:700;color:#333;margin-bottom:6px}
.info-box .order-id{font-size:18px;font-weight:700;color:#6c5ce7}
.status{display:inline-block;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:700}
.status-pending,.status-processing{background:#fff3cd;color:#856404}
.status-shipped{background:#cce5ff;color:#004085}
.status-delivered{background:#d4edda;color:#155724}
.status-cancelled{background:#f8d7da;color:#721c24}
table{width:100%;border-collapse:collapse;margin-bottom:25px;border-radius:12px;overflow:hidden}
th{background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;padding:12px;text-align:left;font-size:13px;font-weight:600}
th:first-child{border-radius:12px 0 0 0}
th:last-child{border-radius:0 12px 0 0}
td{font-size:13px}
tr:hover td{background:#f0f0ff}
.totals{margin-left:auto;width:320px;margin-bottom:30px}
.totals div{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#555}
.totals .grand{font-size:22px;font-weight:800;color:#6c5ce7;border-top:3px solid #6c5ce7;padding-top:14px;margin-top:8px}
.footer{text-align:center;padding-top:25px;border-top:2px dashed #ddd;color:#888;font-size:12px;line-height:2}
.footer .heart{color:#fd79a8;font-size:16px}
@media print{body{padding:15px;background:#fff}.info-box{background:#fff;border:1px solid #ddd}}
</style></head><body>
<div class="header"><h1>🛒 StockMart</h1><p class="subtitle">E-Commerce & Stock Analysis Platform</p><div class="invoice-label">INVOICE</div></div>
<div class="info-grid">
<div class="info-box"><h3>Bill To</h3><p class="name">${order.fullName}</p><p>${order.address}</p><p>${order.city}, ${order.state} - ${order.pincode}</p><p>📞 ${order.phone}</p><p>📧 ${order.email}</p></div>
<div class="info-box" style="text-align:right"><h3>Invoice Details</h3><p class="order-id">Order #${order.id}</p><p>📅 ${date}</p><p>🕐 ${time}</p><p><span class="status status-${order.status}">${order.status.toUpperCase()}</span></p><p>💳 ${(order.paymentMethod||'COD').toUpperCase()}</p></div>
</div>
<table><thead><tr><th>#</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
<div class="totals"><div><span>Subtotal</span><strong>$${order.subtotal.toFixed(2)}</strong></div><div><span>Tax (18% GST)</span><strong>$${order.tax.toFixed(2)}</strong></div><div><span>Shipping</span><strong>${order.shipping===0?'FREE':'$'+order.shipping.toFixed(2)}</strong></div><div class="grand"><span>Grand Total</span><span>$${order.grandTotal.toFixed(2)}</span></div></div>
<div class="footer"><p><span class="heart">❤</span> Thank you for shopping with StockMart!</p><p>Contact: admin@stockmart.com | +91 98765 43210</p><p>This is a computer-generated invoice. No signature required.</p></div>
</body></html>`;
}

function actualDownloadReceipt() {
  const order = window._receiptOrder;
  if (!order) return;
  try {
    const html = buildReceiptHtmlFile(order);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `StockMart_Receipt_Order_${order.id}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    showToast('✅ Receipt downloaded!', 'success');
  } catch(e) {
    const html = buildReceiptHtmlFile(order);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  }
}

function saveReceiptAsPdf() {
  const order = window._receiptOrder;
  if (!order) return;
  const html = buildReceiptHtmlFile(order);
  const printWin = window.open('', '_blank', 'width=850,height=700');
  if (!printWin) { showToast('Please allow popups to save PDF', 'warning'); return; }
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  // Auto-trigger print dialog (user selects "Save as PDF")
  setTimeout(() => printWin.print(), 600);
  showToast('📄 Print dialog opened — choose Save as PDF', 'info');
}

function printReceipt() {
  const order = window._receiptOrder;
  if (!order) return;
  const html = buildReceiptHtmlFile(order);
  const printWin = window.open('', '_blank', 'width=800,height=600');
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => printWin.print(), 500);
}

function printOrderDirect(orderId) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  const url = `/api/orders/download/${orderId}?token=${encodeURIComponent(token)}`;
  const printWin = window.open(url, '_blank');
  if (printWin) {
    printWin.onload = () => setTimeout(() => printWin.print(), 600);
  }
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

function getOrderTrackingTimeline(order, detailed = false) {
  const steps = [
    { key: 'confirmed', icon: 'fa-check-circle', label: 'Confirmed' },
    { key: 'processing', icon: 'fa-cog', label: 'Processing' },
    { key: 'shipped', icon: 'fa-truck', label: 'Shipped' },
    { key: 'delivered', icon: 'fa-box-open', label: 'Delivered' }
  ];

  if (order.status === 'cancelled') {
    return `<div class="order-tracking-timeline">
      <div class="tracking-step cancelled active">
        <div class="tracking-dot"><i class="fas fa-times"></i></div>
        <span class="tracking-label">Cancelled</span>
      </div>
    </div>`;
  }

  const statusOrder = ['confirmed', 'processing', 'shipped', 'delivered'];
  const currentIdx = statusOrder.indexOf(order.status);

  // Calculate ETA
  let etaHtml = '';
  if (order.status !== 'delivered' && order.status !== 'cancelled') {
    const orderDate = new Date(order.created_at);
    const eta = new Date(orderDate);
    let bDays = 0;
    while (bDays < 7) { eta.setDate(eta.getDate() + 1); if (eta.getDay() !== 0 && eta.getDay() !== 6) bDays++; }
    const fmtOpts = { month: 'short', day: 'numeric' };
    etaHtml = `<div class="tracking-eta"><i class="fas fa-calendar-alt"></i> Est. delivery: ${eta.toLocaleDateString('en-US', fmtOpts)}</div>`;
  }

  const stepsHtml = steps.map((step, i) => {
    let cls = 'tracking-step';
    if (i < currentIdx) cls += ' completed';
    else if (i === currentIdx) cls += ' active';
    return `<div class="${cls}">
      <div class="tracking-dot"><i class="fas ${step.icon}"></i></div>
      ${detailed ? `<span class="tracking-label">${step.label}</span>` : ''}
    </div>
    ${i < steps.length - 1 ? `<div class="tracking-line ${i < currentIdx ? 'completed' : ''}"></div>` : ''}`;
  }).join('');

  return `<div class="order-tracking-timeline ${detailed ? 'detailed' : 'compact'}">
    ${detailed ? '<h4 class="tracking-title"><i class="fas fa-route"></i> Order Tracking</h4>' : ''}
    <div class="tracking-steps">${stepsHtml}</div>
    ${etaHtml}
  </div>`;
}

function getDeliveryEstimate(order) {
  if (order.status === 'delivered') {
    return '<div class="order-delivery-info"><i class="fas fa-check-circle"></i> Delivered</div>';
  }
  if (order.status === 'cancelled') {
    return '<div class="order-delivery-info" style="color:#d63031;background:rgba(214,48,49,0.08)"><i class="fas fa-times-circle"></i> Cancelled</div>';
  }
  const orderDate = new Date(order.created_at);
  const eta = new Date(orderDate);
  let bDays = 0;
  while (bDays < 7) { eta.setDate(eta.getDate() + 1); if (eta.getDay() !== 0 && eta.getDay() !== 6) bDays++; }
  const fmtOpts = { month: 'short', day: 'numeric' };
  return `<div class="order-delivery-info"><i class="fas fa-truck"></i> Estimated delivery by ${eta.toLocaleDateString('en-US', fmtOpts)}</div>`;
}

async function reorderItems(orderId) {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  try {
    showToast('Adding items to cart...', 'info');
    const res = await fetch(`${API}/api/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const order = await res.json();
    for (const item of (order.items || [])) {
      await fetch(`${API}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: item.product_id, quantity: item.quantity })
      });
    }
    showToast('🛒 All items added! Redirecting to cart...', 'success');
    setTimeout(() => { window.location.href = 'cart.html'; }, 1200);
  } catch(e) {
    showToast('Reorder failed. Please try again.', 'error');
    console.error('Reorder error:', e);
  }
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
  setTimeout(() => { toast.classList.remove('toast-show'); toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 400); }, 4000);
}

// === Fireworks Animation ===
function launchFireworks() {
  const canvas = document.createElement('canvas');
  canvas.id = 'fireworksCanvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999';
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const particles = [];
  const colors = ['#6c5ce7','#00cec9','#fd79a8','#fdcb6e','#00b894','#e17055','#0984e3','#d63031','#a29bfe','#ffeaa7','#55efc4','#fab1a0'];

  function createBurst(x, y) {
    for (let i = 0; i < 45; i++) {
      const angle = (Math.PI * 2 / 45) * i;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, decay: 0.012 + Math.random() * 0.012,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2.5 + Math.random() * 3.5
      });
    }
  }

  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      createBurst(
        canvas.width * (0.15 + Math.random() * 0.7),
        canvas.height * (0.1 + Math.random() * 0.5)
      );
    }, i * 350);
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.06;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12; ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if (particles.length > 0) requestAnimationFrame(animate);
    else canvas.remove();
  }
  animate();
}
