const express = require("express");
const getDb = require("../db");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const notifications = (await db.query("notifications", n=>n.user_id===req.user.id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const unreadCount = notifications.filter(n=>!n.read).length;
    res.json({ notifications, unreadCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/unread", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const count = await db.count("notifications", n=>n.user_id===req.user.id&&!n.read);
    res.json({ count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/read-all", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const unread = await db.query("notifications", n=>n.user_id===req.user.id&&!n.read);
    await Promise.all(unread.map(n=>db.update("notifications", n.id, { read:true })));
    res.json({ message: `Marked ${unread.length} notifications as read` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const notif = await db.findById("notifications", parseInt(req.params.id));
    if (!notif||notif.user_id!==req.user.id) return res.status(404).json({ error: "Notification not found" });
    await db.update("notifications", notif.id, { read:true });
    res.json({ message: "Marked as read" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const notif = await db.findById("notifications", parseInt(req.params.id));
    if (!notif||notif.user_id!==req.user.id) return res.status(404).json({ error: "Notification not found" });
    await db.delete("notifications", notif.id);
    res.json({ message: "Notification deleted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
