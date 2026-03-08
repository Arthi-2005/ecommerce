const express = require("express");
const getDb = require("../db");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

router.get("/product/:id", async (req, res) => {
  try {
    const db = getDb();
    const productId = parseInt(req.params.id);
    const reviews = (await db.query("reviews", r=>r.product_id===productId)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const total=reviews.length, avgRating=total>0?+(reviews.reduce((s,r)=>s+r.rating,0)/total).toFixed(1):0;
    const breakdown=[5,4,3,2,1].map(star=>({ star, count:reviews.filter(r=>r.rating===star).length, percent:total>0?Math.round((reviews.filter(r=>r.rating===star).length/total)*100):0 }));
    res.json({ reviews, total, avgRating, breakdown });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.post("/product/:id", authenticateToken, async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    const productId = parseInt(req.params.id);
    if (!rating||rating<1||rating>5) return res.status(400).json({ error:"Rating must be between 1 and 5" });
    if (!title||!comment) return res.status(400).json({ error:"Title and comment are required" });
    const db = getDb();
    const product = await db.findById("products", productId);
    if (!product) return res.status(404).json({ error:"Product not found" });
    const existing = await db.query("reviews", r=>r.product_id===productId&&r.user_id===req.user.id);
    if (existing.length>0) return res.status(400).json({ error:"You have already reviewed this product" });
    const userOrders = await db.query("orders", o=>o.user_id===req.user.id);
    const orderIds = userOrders.map(o=>o.id);
    const purchased = await db.query("order_items", oi=>orderIds.includes(oi.order_id)&&oi.product_id===productId);
    const review = await db.insert("reviews", { product_id:productId, user_id:req.user.id, username:req.user.username, rating:parseInt(rating), title:title.substring(0,200), comment:comment.substring(0,2000), verified_purchase:purchased.length>0, helpful_count:0 });
    const allReviews = await db.query("reviews", r=>r.product_id===productId);
    const avgR = +(allReviews.reduce((s,r)=>s+r.rating,0)/allReviews.length).toFixed(1);
    await db.update("products", productId, { rating:avgR, reviews:allReviews.length });
    await db.insert("activities", { user_id:req.user.id, username:req.user.username, action:"review", details:`Reviewed "${product.name}" - ${rating} stars` });
    res.json({ message:"Review submitted!", review });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.post("/:id/helpful", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const review = await db.findById("reviews", parseInt(req.params.id));
    if (!review) return res.status(404).json({ error:"Review not found" });
    await db.update("reviews", review.id, { helpful_count:(review.helpful_count||0)+1 });
    res.json({ message:"Marked as helpful", count:(review.helpful_count||0)+1 });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const review = await db.findById("reviews", parseInt(req.params.id));
    if (!review) return res.status(404).json({ error:"Review not found" });
    if (review.user_id!==req.user.id&&req.user.role!=="admin") return res.status(403).json({ error:"Not authorized" });
    const productId = review.product_id;
    await db.delete("reviews", review.id);
    const allReviews = await db.query("reviews", r=>r.product_id===productId);
    const avgR = allReviews.length>0?+(allReviews.reduce((s,r)=>s+r.rating,0)/allReviews.length).toFixed(1):0;
    await db.update("products", productId, { rating:avgR, reviews:allReviews.length });
    res.json({ message:"Review deleted" });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
