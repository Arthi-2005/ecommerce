const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const getDb = require("../db");
const { JWT_SECRET, authenticateToken } = require("../middleware/auth");
const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: "All fields required" });
  try {
    const db = getDb();
    const exists = await db.findOne("users", "username", username) || await db.findOne("users", "email", email);
    if (exists) return res.status(400).json({ error: "Username or email already exists" });
    const user = await db.insert("users", { username, email, password: bcrypt.hashSync(password, 10), role: "user" });
    const token = jwt.sign({ id: user.id, username, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("token", token, { httpOnly: true, maxAge: 86400000 });
    await db.insert("activities", { user_id: user.id, username, action: "register", details: `New user "${username}" registered` });
    res.json({ message: "Registration successful", token, user: { id: user.id, username, role: "user" } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  try {
    const db = getDb();
    const user = await db.findOne("users", "username", username);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.cookie("token", token, { httpOnly: true, maxAge: 86400000 });
    await db.insert("activities", { user_id: user.id, username: user.username, action: "login", details: `User "${user.username}" logged in` });
    res.json({ message: "Login successful", token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/logout", (req, res) => { res.clearCookie("token"); res.json({ message: "Logged out successfully" }); });
router.get("/me", authenticateToken, (req, res) => { res.json({ user: req.user }); });

module.exports = router;
