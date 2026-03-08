const express = require("express");
const getDb = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").toLowerCase();
    const category = req.query.category || "";
    const sort = req.query.sort || "id";
    const order = req.query.order === "desc" ? -1 : 1;
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || 999999;
    const allowed = ["id","name","price","stock_price","stock_change_percent","rating","reviews","volume","market_cap"];
    const sortCol = allowed.includes(sort) ? sort : "id";
    let products = (await db.getAll("products")).filter(p => {
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (search && !(p.name||"").toLowerCase().includes(search) && !(p.description||"").toLowerCase().includes(search) && !(p.category||"").toLowerCase().includes(search)) return false;
      if (category && p.category !== category) return false;
      return true;
    });
    products.sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === "string") return va.localeCompare(vb) * order;
      return ((va||0)-(vb||0))*order;
    });
    const total = products.length;
    products = products.slice(offset, offset + limit);
    res.json({ products, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/categories", async (req, res) => {
  try {
    const db = getDb();
    const map = {};
    (await db.getAll("products")).forEach(p => { map[p.category] = (map[p.category]||0)+1; });
    res.json(Object.keys(map).sort().map(c => ({ category: c, count: map[c] })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/top-gainers", async (req, res) => {
  try {
    const db = getDb();
    res.json((await db.getAll("products")).sort((a,b)=>b.stock_change_percent-a.stock_change_percent).slice(0, parseInt(req.query.limit)||10));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/top-losers", async (req, res) => {
  try {
    const db = getDb();
    res.json((await db.getAll("products")).sort((a,b)=>a.stock_change_percent-b.stock_change_percent).slice(0, parseInt(req.query.limit)||10));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/most-active", async (req, res) => {
  try {
    const db = getDb();
    res.json((await db.getAll("products")).sort((a,b)=>b.volume-a.volume).slice(0, parseInt(req.query.limit)||10));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const product = await db.findById("products", parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { name, category, subcategory, price, stock_price, description } = req.body;
    if (!name || !category || !price) return res.status(400).json({ error: "Name, category, and price required" });
    const product = await db.insert("products", { name, category, subcategory: subcategory||"", price: parseFloat(price), stock_price: parseFloat(stock_price||price), description: description||"", stock_change:0, stock_change_percent:0, volume:0, market_cap:0, rating:0, reviews:0, in_stock:1, pe_ratio:0, ticker:"" });
    res.json({ message: "Product added", id: product.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { name, category, subcategory, price, stock_price, description, in_stock } = req.body;
    await db.update("products", parseInt(req.params.id), { name, category, subcategory, price: parseFloat(price), stock_price: parseFloat(stock_price), description, in_stock: parseInt(in_stock) });
    res.json({ message: "Product updated" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.delete("products", parseInt(req.params.id));
    res.json({ message: "Product deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
