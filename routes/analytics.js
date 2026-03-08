const express = require("express");
const getDb = require("../db");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

router.get("/history/:productId", async (req, res) => {
  try {
    const db = getDb();
    const history = (await db.query("stock_history", h=>h.product_id===parseInt(req.params.productId))).sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at));
    res.json(history);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get("/overview", async (req, res) => {
  try {
    const db = getDb();
    const products = await db.getAll("products");
    const totalProducts=products.length, totalVolume=products.reduce((s,p)=>s+(p.volume||0),0), totalMarketCap=products.reduce((s,p)=>s+(p.market_cap||0),0);
    const avgStockPrice=products.reduce((s,p)=>s+(p.stock_price||0),0)/(totalProducts||1);
    const gainers=products.filter(p=>p.stock_change>0).length, losers=products.filter(p=>p.stock_change<0).length;
    const avgChange=products.reduce((s,p)=>s+(p.stock_change_percent||0),0)/(totalProducts||1);
    const catMap={};
    products.forEach(p => {
      if (!catMap[p.category]) catMap[p.category]={ category:p.category, count:0, sumPrice:0, sumChange:0, total_volume:0, total_market_cap:0 };
      const c=catMap[p.category]; c.count++; c.sumPrice+=p.stock_price||0; c.sumChange+=p.stock_change_percent||0; c.total_volume+=p.volume||0; c.total_market_cap+=p.market_cap||0;
    });
    const categoryStats=Object.values(catMap).map(c=>({ category:c.category, count:c.count, avg_price:+(c.sumPrice/c.count).toFixed(2), avg_change:+(c.sumChange/c.count).toFixed(2), total_volume:c.total_volume, total_market_cap:c.total_market_cap })).sort((a,b)=>b.total_market_cap-a.total_market_cap);
    res.json({ totalProducts, avgStockPrice:+avgStockPrice.toFixed(2), totalVolume, totalMarketCap:+totalMarketCap.toFixed(2), gainers, losers, avgChange:+avgChange.toFixed(2), categoryStats });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get("/distribution", async (req, res) => {
  try {
    const db = getDb();
    const products = await db.getAll("products");
    const ranges=[{label:"$0-$25",min:0,max:25},{label:"$25-$50",min:25,max:50},{label:"$50-$100",min:50,max:100},{label:"$100-$250",min:100,max:250},{label:"$250-$500",min:250,max:500},{label:"$500-$1000",min:500,max:1000},{label:"$1000+",min:1000,max:999999}];
    const distribution=ranges.map(r=>({ label:r.label, count:products.filter(p=>(p.stock_price||0)>=r.min&&(p.stock_price||0)<r.max).length }));
    res.json(distribution);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get("/sectors", async (req, res) => {
  try {
    const db = getDb();
    const products = await db.getAll("products");
    const catMap={};
    products.forEach(p => {
      if (!catMap[p.category]) catMap[p.category]={ sector:p.category, total_stocks:0, sumChange:0, advancing:0, declining:0, sumPE:0, total_market_cap:0, total_volume:0 };
      const c=catMap[p.category]; c.total_stocks++; c.sumChange+=p.stock_change_percent||0;
      if (p.stock_change>0) c.advancing++; if (p.stock_change<0) c.declining++;
      c.sumPE+=p.pe_ratio||0; c.total_market_cap+=p.market_cap||0; c.total_volume+=p.volume||0;
    });
    const sectors=Object.values(catMap).map(c=>({ sector:c.sector, total_stocks:c.total_stocks, avg_change:+(c.sumChange/c.total_stocks).toFixed(2), advancing:c.advancing, declining:c.declining, avg_pe:+(c.sumPE/c.total_stocks).toFixed(2), total_market_cap:c.total_market_cap, total_volume:c.total_volume })).sort((a,b)=>b.avg_change-a.avg_change);
    res.json(sectors);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get("/screener", async (req, res) => {
  try {
    const db = getDb();
    const { minChange, maxChange, minPE, maxPE, minVol, category } = req.query;
    let products = (await db.getAll("products")).filter(p => {
      if (minChange&&p.stock_change_percent<parseFloat(minChange)) return false;
      if (maxChange&&p.stock_change_percent>parseFloat(maxChange)) return false;
      if (minPE&&p.pe_ratio<parseFloat(minPE)) return false;
      if (maxPE&&p.pe_ratio>parseFloat(maxPE)) return false;
      if (minVol&&p.volume<parseInt(minVol)) return false;
      if (category&&p.category!==category) return false;
      return true;
    });
    products.sort((a,b)=>b.stock_change_percent-a.stock_change_percent);
    res.json(products.slice(0,50));
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
