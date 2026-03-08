const express = require("express");
const bcrypt = require("bcryptjs");
const getDb = require("../db");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.findById("users", req.user.id);
    if (!user) return res.status(404).json({ error:"User not found" });
    const [addresses, orderCount, wishlistCount, reviewCount] = await Promise.all([
      db.query("user_addresses", a=>a.user_id===req.user.id),
      db.count("orders", o=>o.user_id===req.user.id),
      db.count("wishlist", w=>w.user_id===req.user.id),
      db.count("reviews", r=>r.user_id===req.user.id)
    ]);
    const { password, ...safeUser } = user;
    res.json({ ...safeUser, addresses, stats:{ orders:orderCount, wishlist:wishlistCount, reviews:reviewCount } });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.put("/", authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    const db = getDb();
    if (username) { const exists=await db.query("users", u=>u.username===username&&u.id!==req.user.id); if (exists.length>0) return res.status(400).json({ error:"Username already taken" }); }
    if (email) { const exists=await db.query("users", u=>u.email===email&&u.id!==req.user.id); if (exists.length>0) return res.status(400).json({ error:"Email already in use" }); }
    const updates={};
    if (username) updates.username=username;
    if (email) updates.email=email;
    await db.update("users", req.user.id, updates);
    res.json({ message:"Profile updated!" });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.put("/password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword||!newPassword) return res.status(400).json({ error:"Current and new password required" });
    if (newPassword.length<4) return res.status(400).json({ error:"Password must be at least 4 characters" });
    const db = getDb();
    const user = await db.findById("users", req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password)) return res.status(401).json({ error:"Current password is incorrect" });
    await db.update("users", req.user.id, { password:bcrypt.hashSync(newPassword, 10) });
    res.json({ message:"Password changed successfully!" });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.post("/address", authenticateToken, async (req, res) => {
  try {
    const { label, fullName, phone, address, city, state, pincode, isDefault } = req.body;
    if (!fullName||!phone||!address||!city||!state||!pincode) return res.status(400).json({ error:"All address fields required" });
    const db = getDb();
    if (isDefault) { const ex=await db.query("user_addresses", a=>a.user_id===req.user.id&&a.isDefault); await Promise.all(ex.map(a=>db.update("user_addresses", a.id, { isDefault:false }))); }
    const addr = await db.insert("user_addresses", { user_id:req.user.id, label:label||"Home", fullName, phone, address, city, state, pincode, isDefault:!!isDefault });
    res.json({ message:"Address added!", address:addr });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.put("/address/:id", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const addr = await db.findById("user_addresses", parseInt(req.params.id));
    if (!addr||addr.user_id!==req.user.id) return res.status(404).json({ error:"Address not found" });
    const { label, fullName, phone, address, city, state, pincode, isDefault } = req.body;
    if (isDefault) { const ex=await db.query("user_addresses", a=>a.user_id===req.user.id&&a.isDefault); await Promise.all(ex.map(a=>db.update("user_addresses", a.id, { isDefault:false }))); }
    await db.update("user_addresses", addr.id, { label, fullName, phone, address, city, state, pincode, isDefault:!!isDefault });
    res.json({ message:"Address updated!" });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

router.delete("/address/:id", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const addr = await db.findById("user_addresses", parseInt(req.params.id));
    if (!addr||addr.user_id!==req.user.id) return res.status(404).json({ error:"Address not found" });
    await db.delete("user_addresses", addr.id);
    res.json({ message:"Address deleted" });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

module.exports = router;
