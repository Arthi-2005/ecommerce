const express = require("express");
const getDb = require("../db");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const cartItems = await db.query("cart", c => c.user_id === req.user.id);
    const enriched = (await Promise.all(cartItems.map(async item => {
      const product = await db.findById("products", item.product_id);
      return { ...item, product };
    }))).filter(i => i.product);
    const total = enriched.reduce((s,i)=>s+(i.product.price*i.quantity),0);
    const totalItems = enriched.reduce((s,i)=>s+i.quantity,0);
    res.json({ items: enriched, total: +total.toFixed(2), totalItems });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/add", authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id) return res.status(400).json({ error: "Product ID required" });
    const db = getDb();
    const product = await db.findById("products", parseInt(product_id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    const qty = parseInt(quantity)||1;
    const existing = (await db.query("cart", c => c.user_id===req.user.id && c.product_id===parseInt(product_id)))[0];
    if (existing) { await db.update("cart", existing.id, { quantity: existing.quantity+qty }); }
    else { await db.insert("cart", { user_id: req.user.id, product_id: parseInt(product_id), quantity: qty }); }
    await db.insert("activities", { user_id: req.user.id, username: req.user.username, action: "add_to_cart", details: `Added "${product.name}" (x${qty}) to cart`, product_id: parseInt(product_id) });
    const cartCount = (await db.query("cart", c=>c.user_id===req.user.id)).reduce((s,i)=>s+i.quantity,0);
    res.json({ message: "Added to cart!", cartCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/update/:cartId", authenticateToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    const db = getDb();
    const cartItem = await db.findById("cart", parseInt(req.params.cartId));
    if (!cartItem || cartItem.user_id !== req.user.id) return res.status(404).json({ error: "Cart item not found" });
    if (parseInt(quantity) <= 0) { await db.delete("cart", cartItem.id); }
    else { await db.update("cart", cartItem.id, { quantity: parseInt(quantity) }); }
    res.json({ message: "Cart updated" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/remove/:cartId", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const cartItem = await db.findById("cart", parseInt(req.params.cartId));
    if (!cartItem || cartItem.user_id !== req.user.id) return res.status(404).json({ error: "Cart item not found" });
    await db.delete("cart", cartItem.id);
    res.json({ message: "Removed from cart" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/clear", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    await db.deleteWhere("cart", c => c.user_id === req.user.id);
    res.json({ message: "Cart cleared" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/count", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const count = (await db.query("cart", c=>c.user_id===req.user.id)).reduce((s,i)=>s+i.quantity,0);
    res.json({ count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
