const express = require("express");
const getDb = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const router = express.Router();

router.post("/place", authenticateToken, async (req, res) => {
  const { fullName, email, phone, address, city, state, pincode, paymentMethod, paymentDetails } = req.body;
  if (!fullName||!email||!phone||!address||!city||!state||!pincode) return res.status(400).json({ error: "All billing details required" });
  try {
    const db = getDb();
    const cartItems = await db.query("cart", c=>c.user_id===req.user.id);
    if (!cartItems.length) return res.status(400).json({ error: "Cart is empty" });
    let subtotal=0; const outOfStock=[];
    const items = (await Promise.all(cartItems.map(async ci => {
      const product = await db.findById("products", ci.product_id);
      if (!product) return null;
      if (!product.in_stock||(product.stock_qty!==undefined&&product.stock_qty<ci.quantity)) outOfStock.push(product.name);
      const itemTotal=product.price*ci.quantity; subtotal+=itemTotal;
      return { product_id:ci.product_id, name:product.name, category:product.category, price:product.price, quantity:ci.quantity, total:+itemTotal.toFixed(2), image_url:product.image_url };
    }))).filter(Boolean);
    if (outOfStock.length) return res.status(400).json({ error: `Out of stock: ${outOfStock.join(", ")}` });
    const tax=+(subtotal*0.18).toFixed(2); const shipping=subtotal>500?0:49.99;
    const grandTotal=+(subtotal+tax+shipping).toFixed(2);
    let paymentInfo="";
    if (paymentDetails) {
      const pm=paymentMethod||"cod";
      if (pm==="cod"&&paymentDetails.codPhone) paymentInfo=`COD Phone: ${paymentDetails.codPhone}`;
      else if (pm==="card"&&paymentDetails.cardLast4) paymentInfo=`Card ending ${paymentDetails.cardLast4} (${paymentDetails.cardName||""})`;
      else if (pm==="upi"&&paymentDetails.upiId) paymentInfo=`UPI: ${paymentDetails.upiId}`;
      else if (pm==="netbanking"&&paymentDetails.bank) paymentInfo=`${paymentDetails.bank} Bank, A/c ending ${paymentDetails.accountLast4||"****"}`;
    }
    const order = await db.insert("orders", { user_id:req.user.id, username:req.user.username, fullName, email, phone, address, city, state, pincode, paymentMethod:paymentMethod||"cod", paymentDetails:paymentInfo, subtotal:+subtotal.toFixed(2), tax, shipping, grandTotal, status:"confirmed", item_count:items.reduce((s,i)=>s+i.quantity,0) });
    await Promise.all(items.map(async item => {
      await db.insert("order_items", { order_id:order.id, ...item });
      const p = await db.findById("products", item.product_id);
      if (p&&p.stock_qty!==undefined) { const nq=Math.max(0,p.stock_qty-item.quantity); await db.update("products",item.product_id,{stock_qty:nq,in_stock:nq>0?1:0}); }
    }));
    await db.deleteWhere("cart", c=>c.user_id===req.user.id);
    await db.insert("notifications", { user_id:req.user.id, type:"order_confirmed", title:"Order Confirmed!", message:`Your order #${order.id} has been confirmed. Total: $${grandTotal}`, read:false, order_id:order.id });
    await db.insert("activities", { user_id:req.user.id, username:req.user.username, action:"place_order", details:`Placed order #${order.id} - ${items.length} items - $${grandTotal}`, order_id:order.id });
    res.json({ message:"Order placed successfully!", order:{ id:order.id, grandTotal, status:"confirmed", item_count:order.item_count } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/my-orders", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const orders = (await db.query("orders", o=>o.user_id===req.user.id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const enriched = await Promise.all(orders.map(async order => ({ ...order, items: await db.query("order_items", oi=>oi.order_id===order.id) })));
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/all", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const orders = (await db.getAll("orders")).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const enriched = await Promise.all(orders.map(async o => ({ ...o, items: await db.query("order_items", oi=>oi.order_id===o.id) })));
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/activities", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const acts = (await db.getAll("activities")).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    res.json(acts.slice(0,200));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/admin/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const orders = await db.getAll("orders");
    const users = await db.getAll("users");
    const totalRevenue = orders.reduce((s,o)=>s+(o.grandTotal||0),0);
    const pendingOrders = orders.filter(o=>o.status==="confirmed"||o.status==="processing").length;
    const last7=[];
    for (let i=6;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); const ds=d.toISOString().split("T")[0]; const dy=orders.filter(o=>o.created_at&&o.created_at.startsWith(ds)); last7.push({date:ds,count:dy.length,revenue:dy.reduce((s,o)=>s+(o.grandTotal||0),0)}); }
    const ic={}; (await db.getAll("order_items")).forEach(oi=>{ic[oi.name]=(ic[oi.name]||0)+oi.quantity;});
    const topProducts=Object.entries(ic).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count}));
    res.json({ totalRevenue:+totalRevenue.toFixed(2), totalOrders:orders.length, totalUsers:users.length, pendingOrders, last7, topProducts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/download/:id", async (req, res) => {
  const token = req.query.token || req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).send("<h1>Unauthorized</h1>");
  let user;
  try { const jwt=require("jsonwebtoken"); const {JWT_SECRET}=require("../middleware/auth"); user=jwt.verify(token,JWT_SECRET); } catch(e) { return res.status(401).send("<h1>Invalid or expired session</h1>"); }
  try {
    const db = getDb();
    const order = await db.findById("orders", parseInt(req.params.id));
    if (!order) return res.status(404).send("<h1>Order not found</h1>");
    if (order.user_id!==user.id&&user.role!=="admin") return res.status(403).send("<h1>Access denied</h1>");
    const items = await db.query("order_items", oi=>oi.order_id===order.id);
    const html = buildReceiptHtml({...order,items});
    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.setHeader("Content-Disposition",`attachment; filename="StockMart_Receipt_Order_${order.id}.html"`);
    res.send(html);
  } catch(e) { res.status(500).send("<h1>Error generating receipt</h1>"); }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const order = await db.findById("orders", parseInt(req.params.id));
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.user_id!==req.user.id&&req.user.role!=="admin") return res.status(403).json({ error: "Access denied" });
    const items = await db.query("order_items", oi=>oi.order_id===order.id);
    res.json({...order,items});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/admin/status/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const db = getDb();
    const order = await db.findById("orders", parseInt(req.params.id));
    await db.update("orders", parseInt(req.params.id), { status });
    if (order) {
      const msgs={processing:"is being processed",shipped:"has been shipped!",delivered:"has been delivered!",cancelled:"has been cancelled."};
      await db.insert("notifications",{user_id:order.user_id,type:"order_"+status,title:`Order #${req.params.id} ${status.charAt(0).toUpperCase()+status.slice(1)}`,message:`Your order #${req.params.id} ${msgs[status]||"status updated to "+status}`,read:false,order_id:parseInt(req.params.id)});
    }
    await db.insert("activities",{user_id:req.user.id,username:req.user.username,action:"update_order_status",details:`Updated order #${req.params.id} status to "${status}"`,order_id:parseInt(req.params.id)});
    res.json({ message: "Order status updated" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

function buildReceiptHtml(order) {
  const date=new Date(order.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const time=new Date(order.created_at).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
  const itemsHtml=(order.items||[]).map((item,i)=>`<tr><td style="padding:10px 12px;border-bottom:1px solid #eee">${i+1}</td><td style="padding:10px 12px;border-bottom:1px solid #eee">${item.name}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">$${Number(item.price).toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right">$${Number(item.total).toFixed(2)}</td></tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>StockMart Receipt #${order.id}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px 30px;color:#333;background:#fff}.header{text-align:center;padding-bottom:25px;margin-bottom:30px;border-bottom:3px solid #6c5ce7}.header h1{color:#6c5ce7;font-size:32px;letter-spacing:2px}.subtitle{color:#888;margin:5px 0;font-size:14px}.invoice-label{display:inline-block;margin-top:12px;padding:6px 24px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;border-radius:20px;font-weight:700;font-size:14px;letter-spacing:3px}.info-grid{display:flex;justify-content:space-between;margin-bottom:30px;gap:20px}.info-box{flex:1;padding:20px;background:#f8f9fa;border-radius:12px;border:1px solid #eef}.info-box h3{color:#6c5ce7;font-size:12px;margin-bottom:10px;text-transform:uppercase;letter-spacing:2px}.info-box p{margin:4px 0;font-size:13px;color:#555}.iname{font-size:16px;font-weight:700;color:#333;margin-bottom:6px}.oid{font-size:18px;font-weight:700;color:#6c5ce7}table{width:100%;border-collapse:collapse;margin-bottom:25px}th{background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;padding:12px;text-align:left;font-size:13px}td{font-size:13px}.totals{margin-left:auto;width:320px;margin-bottom:30px}.totals .row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#555}.grand{font-size:22px;font-weight:800;color:#6c5ce7;border-top:3px solid #6c5ce7;padding-top:14px;margin-top:8px}.footer{text-align:center;padding-top:25px;border-top:2px dashed #ddd;color:#888;font-size:12px;line-height:2}@media print{body{padding:15px}}</style></head><body><div class="header"><h1>&#128722; StockMart</h1><p class="subtitle">E-Commerce &amp; Stock Analysis Platform</p><div class="invoice-label">INVOICE</div></div><div class="info-grid"><div class="info-box"><h3>Bill To</h3><p class="iname">${order.fullName||""}</p><p>${order.address||""}</p><p>${order.city||""}, ${order.state||""} ${order.pincode||""}</p><p>Phone: ${order.phone||""}</p><p>Email: ${order.email||""}</p></div><div class="info-box" style="text-align:right"><h3>Invoice Details</h3><p class="oid">Order #${order.id}</p><p>Date: ${date}</p><p>Time: ${time}</p><p>Status: ${(order.status||"").toUpperCase()}</p><p>Payment: ${(order.paymentMethod||"COD").toUpperCase()}</p></div></div><table><thead><tr><th>#</th><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="totals"><div class="row"><span>Subtotal</span><strong>$${Number(order.subtotal).toFixed(2)}</strong></div><div class="row"><span>Tax (18% GST)</span><strong>$${Number(order.tax).toFixed(2)}</strong></div><div class="row"><span>Shipping</span><strong>${order.shipping===0?"FREE":"$"+Number(order.shipping).toFixed(2)}</strong></div><div class="row grand"><span>Grand Total</span><span>$${Number(order.grandTotal).toFixed(2)}</span></div></div><div class="footer"><p>Thank you for shopping with StockMart!</p><p>admin@stockmart.com | +91 98765 43210</p><p>Computer-generated invoice. No signature required.</p></div></body></html>`;
}
