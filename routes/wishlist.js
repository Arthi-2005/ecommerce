const express = require("express");
const getDb = require("../db");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const items = await db.query("wishlist", w=>w.user_id===req.user.id);
    const enriched = (await Promise.all(items.map(async w => ({ ...w, product: await db.findById("products", w.product_id) })))).filter(w=>w.product);
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/toggle", authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: "Product ID required" });
    const db = getDb();
    const product = await db.findById("products", parseInt(product_id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    const existing = await db.query("wishlist", w=>w.user_id===req.user.id&&w.product_id===parseInt(product_id));
    if (existing.length>0) { await db.delete("wishlist", existing[0].id); return res.json({ liked:false, message:"Removed from wishlist" }); }
    await db.insert("wishlist", { user_id:req.user.id, product_id:parseInt(product_id) });
    await db.insert("activities", { user_id:req.user.id, username:req.user.username, action:"wishlist", details:`Added "${product.name}" to wishlist` });
    res.json({ liked:true, message:"Added to wishlist!" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/check/:productId", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const exists = await db.query("wishlist", w=>w.user_id===req.user.id&&w.product_id===parseInt(req.params.productId));
    res.json({ liked: exists.length>0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/count", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const count = await db.count("wishlist", w=>w.user_id===req.user.id);
    res.json({ count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
