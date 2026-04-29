const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadLeads, getLeads, trackLead, sendWhatsApp } = require("../controllers/leadController");
const { protect } = require("../middlware/authMiddleware");

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.post("/upload", protect, upload.single("file"), uploadLeads);
router.get("/", protect, getLeads);
router.patch("/track/:id", protect, trackLead);
router.post("/whatsapp", protect, sendWhatsApp);

module.exports = router;
