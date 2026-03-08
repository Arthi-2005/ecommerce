const express = require("express");
const getDb = require("../db");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

router.get("/portfolio", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const investments = await db.query("investments", i=>i.user_id===req.user.id);
    let totalInvested=0, currentValue=0;
    const enriched = (await Promise.all(investments.map(async inv => {
      const product = await db.findById("products", inv.product_id);
      if (!product) return null;
      const cp=product.stock_price, inv_amt=inv.buy_price*inv.shares, cur=cp*inv.shares, pnl=cur-inv_amt;
      const pnlPct=inv_amt>0?((pnl/inv_amt)*100):0;
      totalInvested+=inv_amt; currentValue+=cur;
      return { ...inv, product_name:product.name, product_category:product.category, image_url:product.image_url,
        current_price:cp, invested:+inv_amt.toFixed(2), current_value:+cur.toFixed(2),
        pnl:+pnl.toFixed(2), pnl_percent:+pnlPct.toFixed(2), stock_change_percent:product.stock_change_percent };
    }))).filter(Boolean);
    const totalPnl=currentValue-totalInvested, totalPnlPct=totalInvested>0?((totalPnl/totalInvested)*100):0;
    res.json({ investments:enriched, summary:{ totalInvested:+totalInvested.toFixed(2), currentValue:+currentValue.toFixed(2), totalPnl:+totalPnl.toFixed(2), totalPnlPercent:+totalPnlPct.toFixed(2), totalHoldings:enriched.length } });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.post("/buy", authenticateToken, async (req, res) => {
  try {
    const { product_id, shares } = req.body;
    if (!product_id||!shares||shares<1) return res.status(400).json({ error:"Product ID and valid shares required" });
    const db = getDb();
    const product = await db.findById("products", parseInt(product_id));
    if (!product) return res.status(404).json({ error:"Product not found" });
    const numShares=parseInt(shares), buyPrice=product.stock_price, totalCost=+(buyPrice*numShares).toFixed(2);
    const existing = await db.query("investments", i=>i.user_id===req.user.id&&i.product_id===parseInt(product_id));
    if (existing.length>0) {
      const old=existing[0], ts=old.shares+numShares, avgPrice=+((old.buy_price*old.shares+buyPrice*numShares)/ts).toFixed(2);
      await db.update("investments", old.id, { shares:ts, buy_price:avgPrice });
    } else {
      await db.insert("investments", { user_id:req.user.id, product_id:parseInt(product_id), shares:numShares, buy_price:buyPrice });
    }
    await db.insert("activities", { user_id:req.user.id, username:req.user.username, action:"buy_stock", details:`Bought ${numShares} shares of "${product.name}" at $${buyPrice.toFixed(2)} (Total: $${totalCost})` });
    res.json({ message:`Bought ${numShares} shares of ${product.name}!`, totalCost });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.post("/sell", authenticateToken, async (req, res) => {
  try {
    const { product_id, shares } = req.body;
    if (!product_id||!shares||shares<1) return res.status(400).json({ error:"Product ID and valid shares required" });
    const db = getDb();
    const product = await db.findById("products", parseInt(product_id));
    if (!product) return res.status(404).json({ error:"Product not found" });
    const numShares=parseInt(shares);
    const existing = await db.query("investments", i=>i.user_id===req.user.id&&i.product_id===parseInt(product_id));
    if (existing.length===0) return res.status(400).json({ error:"You don't hold this stock" });
    const holding=existing[0];
    if (holding.shares<numShares) return res.status(400).json({ error:`You only have ${holding.shares} shares` });
    const sellPrice=product.stock_price, totalRevenue=+(sellPrice*numShares).toFixed(2), pnl=+((sellPrice-holding.buy_price)*numShares).toFixed(2);
    if (holding.shares===numShares) await db.delete("investments", holding.id);
    else await db.update("investments", holding.id, { shares:holding.shares-numShares });
    await db.insert("activities", { user_id:req.user.id, username:req.user.username, action:"sell_stock", details:`Sold ${numShares} shares of "${product.name}" at $${sellPrice.toFixed(2)} (P&L: ${pnl>=0?"+":""}$${pnl})` });
    res.json({ message:`Sold ${numShares} shares!`, totalRevenue, pnl });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get("/market", async (req, res) => {
  try {
    const db = getDb();
    const products = await db.getAll("products");
    const topGainers=[...products].sort((a,b)=>b.stock_change_percent-a.stock_change_percent).slice(0,10);
    const topLosers=[...products].sort((a,b)=>a.stock_change_percent-b.stock_change_percent).slice(0,10);
    const mostActive=[...products].sort((a,b)=>b.volume-a.volume).slice(0,10);
    const totalMarketCap=products.reduce((s,p)=>s+(p.market_cap||0),0);
    const avgChange=products.reduce((s,p)=>s+p.stock_change_percent,0)/products.length;
    res.json({ topGainers, topLosers, mostActive, totalMarketCap, avgChange, totalStocks:products.length });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get("/ipos", async (req, res) => {
  try {
    const db = getDb();
    const ipos = await db.getAll("ipos");
    const now = new Date();
    const enriched = ipos.map(ipo => {
      const open=new Date(ipo.open_date), close=new Date(ipo.close_date);
      let status=ipo.status;
      if (status!=="listed") { if (now<open) status="upcoming"; else if (now>=open&&now<=close) status="active"; else status="closed"; }
      return { ...ipo, status };
    });
    res.json({ upcoming:enriched.filter(i=>i.status==="upcoming").sort((a,b)=>new Date(a.open_date)-new Date(b.open_date)), active:enriched.filter(i=>i.status==="active").sort((a,b)=>new Date(a.close_date)-new Date(b.close_date)), closed:enriched.filter(i=>i.status==="closed"||i.status==="listed").sort((a,b)=>new Date(b.close_date)-new Date(a.close_date)) });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get("/ipos/:id", async (req, res) => {
  try {
    const db = getDb();
    const ipo = await db.findById("ipos", parseInt(req.params.id));
    if (!ipo) return res.status(404).json({ error:"IPO not found" });
    const totalApps = await db.count("ipo_applications", a=>a.ipo_id===ipo.id);
    const apps = await db.query("ipo_applications", a=>a.ipo_id===ipo.id);
    const totalLotsApplied = apps.reduce((sum,a)=>sum+a.lots,0);
    res.json({ ...ipo, totalApplications:totalApps, totalLotsApplied });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.post("/ipos/:id/apply", authenticateToken, async (req, res) => {
  try {
    const { lots } = req.body;
    const ipoId = parseInt(req.params.id);
    if (!lots||lots<1||lots>15) return res.status(400).json({ error:"Lots must be between 1 and 15" });
    const db = getDb();
    const ipo = await db.findById("ipos", ipoId);
    if (!ipo) return res.status(404).json({ error:"IPO not found" });
    const now=new Date(), open=new Date(ipo.open_date), close=new Date(ipo.close_date);
    if (now<open||now>close) return res.status(400).json({ error:"IPO is not currently accepting applications" });
    const existing = await db.query("ipo_applications", a=>a.ipo_id===ipoId&&a.user_id===req.user.id);
    if (existing.length>0) return res.status(400).json({ error:"You have already applied for this IPO" });
    const numLots=parseInt(lots), totalShares=numLots*ipo.lot_size, totalAmount=+(totalShares*ipo.price_band_high).toFixed(2);
    const application = await db.insert("ipo_applications", { ipo_id:ipoId, user_id:req.user.id, lots:numLots, shares:totalShares, bid_price:ipo.price_band_high, total_amount:totalAmount, status:"applied", applied_at:new Date().toISOString() });
    await db.insert("activities", { user_id:req.user.id, username:req.user.username, action:"ipo_apply", details:`Applied for ${ipo.company_name} IPO - ${numLots} lot(s)` });
    res.json({ message:`Successfully applied for ${ipo.company_name} IPO!`, application:{ id:application.id, lots:numLots, shares:totalShares, totalAmount, status:"applied" } });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.get("/my-ipos", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const apps = await db.query("ipo_applications", a=>a.user_id===req.user.id);
    const enriched = await Promise.all(apps.map(async app => {
      const ipo = await db.findById("ipos", app.ipo_id);
      return { ...app, company_name:ipo?ipo.company_name:"Unknown", logo_url:ipo?ipo.logo_url:"", listing_price:ipo?ipo.listing_price:null, ipo_status:ipo?ipo.status:"unknown" };
    }));
    res.json(enriched);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.delete("/ipos/:id/withdraw", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const ipoId = parseInt(req.params.id);
    const appList = await db.query("ipo_applications", a=>a.ipo_id===ipoId&&a.user_id===req.user.id);
    if (appList.length===0) return res.status(404).json({ error:"No application found" });
    if (appList[0].status!=="applied") return res.status(400).json({ error:"Cannot withdraw - application already processed" });
    const ipo = await db.findById("ipos", ipoId);
    const now=new Date(), close=new Date(ipo.close_date);
    if (now>close) return res.status(400).json({ error:"IPO bidding period is over" });
    await db.delete("ipo_applications", appList[0].id);
    await db.insert("activities", { user_id:req.user.id, username:req.user.username, action:"ipo_withdraw", details:`Withdrew application for ${ipo?ipo.company_name:"IPO"} IPO` });
    res.json({ message:"IPO application withdrawn successfully" });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// Admin: get all IPO applications
router.get("/admin/applications", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error:"Admin only" });
    const db = getDb();
    const apps = await db.query("ipo_applications");
    const enriched = await Promise.all(apps.map(async app => {
      const [ipo, user] = await Promise.all([
        db.findById("ipos", app.ipo_id),
        db.findById("users", app.user_id)
      ]);
      return { ...app, company_name:ipo?ipo.company_name:"Unknown", ticker:ipo?ipo.ticker:"-", username:user?user.username:"Unknown", email:user?user.email:"-" };
    }));
    enriched.sort((a,b) => new Date(b.applied_at) - new Date(a.applied_at));
    res.json(enriched);
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
