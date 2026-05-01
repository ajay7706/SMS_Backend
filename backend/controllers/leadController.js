const Lead = require("../models/Lead");
const DeletedLog = require("../models/DeletedLog");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const axios = require("axios");

const twilio = require("twilio");

// Initialize Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Cache for pincode lookups to speed up processing
const pincodeCache = new Map();

const getPincodeData = async (pincode) => {
  if (!pincode || pincode.length !== 6) return { district: "N/A", state: "N/A", areaType: "Village" };
  if (pincodeCache.has(pincode)) return pincodeCache.get(pincode);

  try {
    const res = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = res.data[0];
    if (data.Status === "Success" && data.PostOffice && data.PostOffice.length > 0) {
      const office = data.PostOffice[0];
      
      // Better heuristic for City vs Village
      // 1. Urban metros prefixes
      const urbanPrefixes = ["11", "40", "56", "60", "70", "38", "50", "20"]; 
      const isUrbanPrefix = urbanPrefixes.some(p => pincode.startsWith(p));
      
      // 2. Urban Pincodes often end in 0 or 1 (Head Offices)
      const isHO = pincode.endsWith("0") || pincode.endsWith("1");
      
      // 3. If there are many post offices for one pincode, it's usually a City
      const isHighDensity = data.PostOffice.length > 5;

      const areaType = (isUrbanPrefix || isHO || isHighDensity) ? "City" : "Village";

      const info = {
        district: office.District,
        state: office.State,
        areaType
      };
      pincodeCache.set(pincode, info);
      return info;
    }
  } catch (err) {
    console.error(`Pincode API error for ${pincode}:`, err.message);
  }
  
  // Fallback
  const areaType = pincode.endsWith("0") || pincode.endsWith("1") ? "City" : "Village";
  return { district: "Unknown", state: "Unknown", areaType };
};



// @desc    Upload and process leads from CSV/XLSX
// @route   POST /api/leads/upload
exports.uploadLeads = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const buffer = req.file.buffer;

    let rawData = [];

    // Parse CSV or Excel
    if (req.file.originalname.endsWith(".csv")) {
      const csvString = buffer.toString();
      const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
      rawData = parsed.data;
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    console.log("Parsed Data Batch:", rawData.slice(0, 5)); // Debug first 5 rows

    const leadsToInsert = [];
    
    // Process rows without strict validation
    for (const row of rawData) {
      try {
        if (!row || Object.keys(row).length === 0) continue;

        // Case-insensitive mapping
        const getVal = (obj, keys) => {
          const foundKey = Object.keys(obj).find(k => keys.some(pk => pk.toLowerCase() === k.toLowerCase().trim()));
          return foundKey ? String(obj[foundKey]).trim() : "";
        };

        const name = getVal(row, ["name", "full name", "customer name", "lead name"]);
        const rawPhone = getVal(row, ["phone", "mobile", "mobile number", "contact", "phone number"]);
        const phone = rawPhone.replace(/\D/g, "");
        const pincode = getVal(row, ["pincode", "pin", "pin code", "zip", "zipcode"]);

        // Pincode Data Fetch
        let pinData = { district: "", state: "", areaType: "City" };
        if (pincode) {
          pinData = await getPincodeData(pincode);
        }

        leadsToInsert.push({
          ...row, // Store all dynamic data
          name: name || "Unknown",
          phone: phone,
          pincode: pincode,
          district: pinData.district,
          state: pinData.state,
          areaType: pinData.areaType,
          agentId: req.user.id,
          status: "pending",
          createdAt: new Date(),
        });
      } catch (err) {
        console.log("Row skip error:", err.message);
      }
    }

    if (leadsToInsert.length > 0) {
      // insertMany with ordered: false to skip duplicates/errors instead of failing
      await Lead.insertMany(leadsToInsert, { ordered: false });
      
      const User = require("../models/User");
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { totalLeads: leadsToInsert.length }
      });
    }

    res.json({ message: "Upload processed successfully", count: leadsToInsert.length });
  } catch (error) {
    console.log("CRITICAL UPLOAD ERROR:", error);
    res.status(500).json({ error: "Server error during upload" });
  }
};

// @desc    Get leads with pagination (Optimized for speed)
exports.getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = req.user.role === "admin" ? {} : { agentId: req.user.id };

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Lead.countDocuments(query)
    ]);

    res.json({
      leads,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.log("GET LEADS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// @desc    Delete lead with logging
exports.deleteLead = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: "Reason is required" });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Step 1: Log (Safe serialization)
    try {
      await DeletedLog.create({
        name: lead.name,
        phone: lead.phone,
        reason,
        deletedBy: req.user.id,
        deletedByName: req.user.name,
        deletedAt: new Date(),
        originalData: lead.toObject() 
      });
    } catch (logErr) {
      console.log("Log creation failed (continuing deletion):", logErr.message);
    }

    // Step 2: Delete
    await Lead.findByIdAndDelete(req.params.id);

    res.json({ message: "Lead deleted successfully" });
  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete lead: " + err.message });
  }
};

// @desc    Bulk Delete Leads by IDs
exports.bulkDeleteLeads = async (req, res) => {
  try {
    const { ids, reason } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Selection is empty" });
    }
    if (!reason) return res.status(400).json({ message: "Reason is required" });

    const leads = await Lead.find({ _id: { $in: ids } }).lean();
    if (leads.length === 0) return res.status(404).json({ message: "No leads found to delete" });

    // Step 1: Bulk Log
    try {
      const logs = leads.map(l => ({
        name: l.name,
        phone: l.phone,
        reason: `[Bulk] ${reason}`,
        deletedBy: req.user.id,
        deletedByName: req.user.name,
        deletedAt: new Date(),
        originalData: l
      }));
      await DeletedLog.insertMany(logs, { ordered: false });
    } catch (logErr) {
      console.log("Bulk log failed:", logErr.message);
    }

    // Step 2: Bulk Delete
    const result = await Lead.deleteMany({ _id: { $in: ids } });

    res.json({ message: `Successfully deleted ${result.deletedCount} leads` });
  } catch (err) {
    console.log("BULK DELETE ERROR:", err);
    res.status(500).json({ error: "Bulk delete failed: " + err.message });
  }
};



// @desc    Get deleted logs grouped by day (Admin only)
exports.getGroupedLogs = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" });

    const grouped = await DeletedLog.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$deletedAt" } },
          count: { $sum: 1 },
          logs: { $push: "$$ROOT" }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Delete logs for a specific day
exports.deleteLogsByDate = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" });
    const { date } = req.body; // Format: YYYY-MM-DD
    if (!date) return res.status(400).json({ message: "Date is required" });

    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const result = await DeletedLog.deleteMany({
      deletedAt: { $gte: start, $lt: end }
    });

    res.json({ message: `Successfully cleared ${result.deletedCount} logs for ${date}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get deleted logs (Legacy fallback)
exports.getDeletedLogs = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const logs = await DeletedLog.find().sort({ deletedAt: -1 }).limit(100).lean();
    res.json(logs);
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

    if (lead.status === "tracked") {
      return res.status(400).json({ message: "Lead is already tracked" });
    }

    lead.status = "tracked";
    await lead.save();

    // Update agent's totalTricked stat for Admin dashboard
    const User = require("../models/User");
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalTricked: 1 }
    });

    res.json({ message: "Lead tracked successfully", lead });
  } catch (err) {
    console.log("TRACK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


// @desc    Send WhatsApp Message
// @route   POST /api/leads/whatsapp
exports.sendWhatsApp = async (req, res) => {
  const { phone, name } = req.body;
  const cleanPhone = phone.startsWith("91") ? phone : `91${phone}`;

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
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:+${cleanPhone}`,
    });

    console.log(`WhatsApp sent to ${cleanPhone}: ${result.sid}`);
    res.json({ success: true, message: "WhatsApp message sent via API" });
  } catch (err) {
    console.error("WhatsApp API Error:", err.response?.data || err.message);
    res.status(500).json({ 
      success: false, 
      message: err.message.includes("not allowed") ? "Number not allowed in Sandbox" : "Failed to send message via API" 
    });
  }
};

