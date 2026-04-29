const Lead = require("../models/Lead");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const axios = require("axios");

// Helper to detect City/Village from Pincode (Mock Logic)
const detectAreaType = (pincode) => {
  // Simple logic: Pincodes ending in 0, 1, or 2 are often urban hubs
  const urbanSuffixes = ["0", "1", "2"];
  return urbanSuffixes.includes(pincode.slice(-1)) ? "City" : "Village";
};

// @desc    Upload and process leads from CSV/XLSX
// @route   POST /api/leads/upload
exports.uploadLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a file" });
    }

    let rawData = [];
    const buffer = req.file.buffer;

    if (req.file.originalname.endsWith(".csv")) {
      const csvString = buffer.toString();
      const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
      rawData = parsed.data;
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    if (rawData.length > 14000) {
      return res.status(400).json({ message: "Maximum 14,000 rows allowed" });
    }

    const leads = rawData.map((row) => ({
      name: row.name || row.Name || "Unknown",
      phone: row.phone || row.Phone || row.Mobile || "0000000000",
      pincode: row.pincode || row.Pincode || "000000",
      areaType: detectAreaType(String(row.pincode || "")),
      agentId: req.user.id,
      status: "pending",
      createdAt: new Date(),
    })).filter(l => l.phone !== "0000000000");

    if (leads.length === 0) {
      return res.status(400).json({ message: "No valid data found in file" });
    }

    await Lead.insertMany(leads);

    res.status(201).json({ 
      message: `${leads.length} leads uploaded successfully`,
      count: leads.length 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get leads with pagination
// @route   GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = req.user.role === "admin" ? {} : { agentId: req.user.id };

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Lead.countDocuments(query);

    res.json({
      leads,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Mark lead as tracked
// @route   PATCH /api/leads/track/:id
exports.trackLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    lead.status = "tracked";
    await lead.save();

    res.json({ message: "Lead tracked successfully", lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Send WhatsApp Message
// @route   POST /api/leads/whatsapp
exports.sendWhatsApp = async (req, res) => {
  const { phone, name } = req.body;

  const message = `⚡ EcoPlug Charging Station ⚡

Hello ${name || "Sir/Ma’am"} 👋

As we discussed on the call, we are contacting you from EcoPlug Charging Station.

🚗🔌 EV (Electric Vehicle) demand is growing very fast, and starting a charging station is a good business opportunity.

💼 You can install an EcoPlug Charging Station at your location:
✔️ Low investment
✔️ High demand in future
✔️ Full setup support
✔️ Installation help

📍 If you have space (shop, petrol pump, parking, or open area), you can easily start this business.

🔗 For more details, connect with us:
📸 Instagram: https://instagram.com/ecopluglko.samgroup
📘 Facebook: https://facebook.com/EcoPluglkosamgroup
📧 Email: ecopluglko.samgroup@gmail.com

👉 If you are interested, please reply or continue chat on WhatsApp.

Thank you 🙏
Team EcoPlug ⚡`;

  try {
    // For production, use Meta Cloud API or Twilio.
    // For now, we return a WhatsApp click-to-chat URL or mock the API success.
    // If WHATSAPP_API_KEY exists, we'd call the real service.
    
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    res.json({ 
      success: true, 
      message: "WhatsApp message generated", 
      url: waUrl 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to send WhatsApp message" });
  }
};
