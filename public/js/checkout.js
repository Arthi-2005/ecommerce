// ===== StockMart - Checkout JS =====
const API = '';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  loadCheckoutSummary();
  initPaymentToggle();
  document.getElementById('checkoutForm').addEventListener('submit', placeOrder);
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

async function loadCheckoutSummary() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API}/api/cart`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    
    if (data.items.length === 0) {
      window.location.href = 'cart.html';
      return;
    }

    const container = document.getElementById('checkoutItems');
    container.innerHTML = data.items.map(item => {
      const p = item.product;
      return `
        <div class="checkout-item">
          <img src="${p.image_url}" alt="${escapeHtml(p.name)}" class="checkout-item-img" onerror="this.src='https://placehold.co/60x60/1a1a3e/6c5ce7?text=P'">
          <div class="checkout-item-info">
            <div class="checkout-item-name">${escapeHtml(p.name)}</div>
            <div class="checkout-item-qty">Qty: ${item.quantity} × $${p.price.toFixed(2)}</div>
          </div>
          <div class="checkout-item-price">$${(p.price * item.quantity).toFixed(2)}</div>
        </div>
      `;
    }).join('');

    const subtotal = data.total;
    const tax = (subtotal * 0.18).toFixed(2);
    const shipping = subtotal > 500 ? 0 : 49.99;
    const grand = (subtotal + parseFloat(tax) + shipping).toFixed(2);

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax}`;
    document.getElementById('shipping').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('grandTotal').textContent = `$${grand}`;
  } catch(e) {
    console.error('Error loading checkout:', e);
  }
}

function initPaymentToggle() {
  document.querySelectorAll('.payment-option input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('active'));
      radio.closest('.payment-option').classList.add('active');
      // Show/hide payment detail sections
      document.querySelectorAll('.payment-details-section').forEach(s => s.style.display = 'none');
      const detailSection = document.getElementById('payDetail-' + radio.value);
      if (detailSection) detailSection.style.display = 'block';
      // Update steps
      document.getElementById('step2').classList.add('active');
    });
  });
  // Card number formatting
  const cardNum = document.getElementById('cardNumber');
  if (cardNum) {
    cardNum.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 16);
      val = val.replace(/(.{4})/g, '$1 ').trim();
      e.target.value = val;
    });
  }
  // Card expiry formatting
  const cardExp = document.getElementById('cardExpiry');
  if (cardExp) {
    cardExp.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2);
      e.target.value = val;
    });
  }
  // Prefill COD phone from billing phone
  const phoneField = document.getElementById('phone');
  if (phoneField) {
    phoneField.addEventListener('input', () => {
      const codPhone = document.getElementById('codPhone');
      if (codPhone && !codPhone.dataset.userEdited) codPhone.value = phoneField.value;
    });
  }
  const codPhone = document.getElementById('codPhone');
  if (codPhone) {
    codPhone.addEventListener('input', () => { codPhone.dataset.userEdited = 'true'; });
  }
}

function validatePaymentDetails(method) {
  if (method === 'cod') {
    const phone = document.getElementById('codPhone')?.value?.trim();
    if (!phone) { showToast('Please confirm your phone number for COD', 'error'); return false; }
    return true;
  }
  if (method === 'card') {
    const name = document.getElementById('cardName')?.value?.trim();
    const number = document.getElementById('cardNumber')?.value?.replace(/\s/g, '');
    const expiry = document.getElementById('cardExpiry')?.value?.trim();
    const cvv = document.getElementById('cardCvv')?.value?.trim();
    if (!name) { showToast('Enter cardholder name', 'error'); return false; }
    if (!number || number.length < 13) { showToast('Enter valid card number', 'error'); return false; }
    if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) { showToast('Enter valid expiry (MM/YY)', 'error'); return false; }
    if (!cvv || cvv.length < 3) { showToast('Enter valid CVV', 'error'); return false; }
    return true;
  }
  if (method === 'upi') {
    const upiId = document.getElementById('upiId')?.value?.trim();
    if (!upiId || !upiId.includes('@')) { showToast('Enter valid UPI ID (e.g. name@paytm)', 'error'); return false; }
    return true;
  }
  if (method === 'netbanking') {
    const bank = document.getElementById('netBank')?.value;
    const account = document.getElementById('netAccount')?.value?.trim();
    const ifsc = document.getElementById('netIfsc')?.value?.trim();
    if (!bank) { showToast('Select your bank', 'error'); return false; }
    if (!account) { showToast('Enter account number', 'error'); return false; }
    if (!ifsc || ifsc.length < 11) { showToast('Enter valid IFSC code', 'error'); return false; }
    return true;
  }
  return true;
}

function getPaymentDetails(method) {
  if (method === 'cod') return { codPhone: document.getElementById('codPhone')?.value?.trim() };
  if (method === 'card') {
    const num = document.getElementById('cardNumber')?.value?.replace(/\s/g, '') || '';
    return { cardLast4: num.slice(-4), cardName: document.getElementById('cardName')?.value?.trim(), cardExpiry: document.getElementById('cardExpiry')?.value?.trim() };
  }
  if (method === 'upi') return { upiId: document.getElementById('upiId')?.value?.trim() };
  if (method === 'netbanking') return { bank: document.getElementById('netBank')?.value, accountLast4: (document.getElementById('netAccount')?.value?.trim() || '').slice(-4), ifsc: document.getElementById('netIfsc')?.value?.trim()?.toUpperCase() };
  return {};
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

async function placeOrder(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const btn = e.target.querySelector('button[type="submit"]');
  const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

  // Validate payment details
  if (!validatePaymentDetails(paymentMethod)) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

  const orderData = {
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    pincode: document.getElementById('pincode').value,
    paymentMethod,
    paymentDetails: getPaymentDetails(paymentMethod)
  };

  try {
    const res = await fetch(`${API}/api/orders/place`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error placing order');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
      return;
    }

    // Show success
    document.getElementById('step3').classList.add('active');
    document.getElementById('orderId').textContent = `#${data.order.id}`;
    document.getElementById('successTotal').textContent = `$${data.order.grandTotal.toFixed(2)}`;

    // Delivery ETA (5-7 business days)
    const now = new Date();
    const etaMin = new Date(now);
    const etaMax = new Date(now);
    let bDaysAdded = 0;
    while (bDaysAdded < 5) { etaMin.setDate(etaMin.getDate() + 1); if (etaMin.getDay() !== 0 && etaMin.getDay() !== 6) bDaysAdded++; }
    bDaysAdded = 0;
    while (bDaysAdded < 7) { etaMax.setDate(etaMax.getDate() + 1); if (etaMax.getDay() !== 0 && etaMax.getDay() !== 6) bDaysAdded++; }
    const fmtOpts = { month: 'short', day: 'numeric' };
    document.getElementById('deliveryEtaDate').textContent = `${etaMin.toLocaleDateString('en-US', fmtOpts)} — ${etaMax.toLocaleDateString('en-US', fmtOpts)}`;
    document.getElementById('deliveryEtaRange').textContent = `Your order will be delivered in 5-7 business days`;

    // Order summary in success modal
    const summaryEl = document.getElementById('successOrderSummary');
    const checkoutItems = document.querySelectorAll('.checkout-item');
    let itemsHtml = '';
    checkoutItems.forEach(ci => {
      const name = ci.querySelector('.checkout-item-name')?.textContent || '';
      const price = ci.querySelector('.checkout-item-price')?.textContent || '';
      itemsHtml += `<div class="success-summary-item"><span class="item-name">${escapeHtml(name)}</span><span>${escapeHtml(price)}</span></div>`;
    });
    summaryEl.innerHTML = `
      <h4><i class="fas fa-box"></i> Order Summary</h4>
      ${itemsHtml}
      <div class="success-summary-item" style="font-weight:700;color:#fff;border-top:1px solid var(--glass-border);padding-top:8px;margin-top:4px">
        <span>Grand Total</span><span class="gradient-text">$${data.order.grandTotal.toFixed(2)}</span>
      </div>
    `;

    document.getElementById('successModal').classList.add('show');
    launchFireworks();
    // Store order id for receipt download
    window._lastOrderId = data.order.id;
    // Auto-redirect to orders page countdown
    let count = 5;
    const countEl = document.getElementById('redirectCount');
    const timer = setInterval(() => {
      count--;
      if (countEl) countEl.textContent = count;
      if (count <= 0) { clearInterval(timer); window.location.href = 'orders.html'; }
    }, 1000);
    window._redirectTimer = timer;
    localStorage.setItem('lastOrder', JSON.stringify({
      id: data.order.id,
      grandTotal: data.order.grandTotal,
      timestamp: Date.now()
    }));
  } catch(e) {
    alert('Network error. Please try again.');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
  }
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
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 / 40) * i;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, decay: 0.015 + Math.random() * 0.01,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3
      });
    }
  }

  // Launch multiple bursts
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      createBurst(
        canvas.width * (0.2 + Math.random() * 0.6),
        canvas.height * (0.15 + Math.random() * 0.5)
      );
    }, i * 400);
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    if (particles.length > 0) requestAnimationFrame(animate);
    else canvas.remove();
  }
  animate();
}

// === Bill Receipt Download ===
function downloadReceipt() {
  const orderId = window._lastOrderId;
  if (!orderId) { alert('Order not found. Please try from the Orders page.'); return; }
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }
  window.location.href = `/api/orders/download/${orderId}?token=${encodeURIComponent(token)}`;
}

function printCheckoutReceipt() {
  const orderId = window._lastOrderId;
  if (!orderId) return;
  const token = localStorage.getItem('token');
  if (!token) return;
  window.open(`/api/orders/download/${orderId}?token=${encodeURIComponent(token)}`, '_blank');
}

function buildCheckoutReceiptHtml(order) {
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

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
