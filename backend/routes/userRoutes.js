const express = require("express");
const router = express.Router();
const { getAgents, createAgent, updateStats, deleteAgent } = require("../controllers/userController");
const { protect, isAdmin } = require("../middlware/authMiddleware");

router.get("/agents", protect, isAdmin, getAgents);
router.post("/agents", protect, isAdmin, createAgent);
router.put("/agents/:id/stats", protect, updateStats);
router.delete("/agents/:id", protect, isAdmin, deleteAgent);

module.exports = router;
