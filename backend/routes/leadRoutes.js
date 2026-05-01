const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadLeads, getLeads, trackLead, sendWhatsApp, deleteLead, getDeletedLogs, bulkDeleteLeads, getGroupedLogs, deleteLogsByDate } = require("../controllers/leadController");
const { protect } = require("../middlware/authMiddleware");

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // Increased to 20MB for larger files
});

router.post("/upload", protect, upload.single("file"), uploadLeads);
router.get("/", protect, getLeads);
router.delete("/:id", protect, deleteLead);
router.post("/bulk-delete", protect, bulkDeleteLeads);
router.get("/logs", protect, getDeletedLogs);
router.get("/logs/grouped", protect, getGroupedLogs);
router.post("/logs/delete-day", protect, deleteLogsByDate);

router.patch("/track/:id", protect, trackLead);
router.post("/whatsapp", protect, sendWhatsApp);


module.exports = router;

