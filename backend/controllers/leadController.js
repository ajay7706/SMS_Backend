const Lead = require("../models/Lead");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const axios = require("axios");

const twilio = require("twilio");

// Initialize Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Cache for pincode lookups to speed up processing
const pincodeCache = new Map();

const getPincodeData = async (pincode) => {
  if (pincodeCache.has(pincode)) return pincodeCache.get(pincode);

  try {
    const res = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = res.data[0];
    if (data.Status === "Success" && data.PostOffice && data.PostOffice.length > 0) {
      const info = {
        district: data.PostOffice[0].District,
        state: data.PostOffice[0].State,
        areaType: data.PostOffice[0].District ? "City" : "Village"
      };
      pincodeCache.set(pincode, info);
      return info;
    }
  } catch (err) {
    console.error(`Pincode API error for ${pincode}:`, err.message);
  }
  
  return { district: "Unknown", state: "Unknown", areaType: "Village" };
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

    // 1. Read file safely
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

    const leadsToInsert = [];
    
    // 2. Process data with safety checks
    for (const row of rawData) {
      try {
        // Auto-detect column names
        const rawPin = String(row.pincode || row.pin || row.PIN || row.Pin || row.Pincode || "").trim();
        const rawName = String(row.name || row.Name || row.NAME || "Unknown").trim();
        const rawPhone = String(row.phone || row.Phone || row.mobile || row.Mobile || row.PHONE || "").trim().replace(/\D/g, "");

        // Basic validation
        if (rawPhone.length >= 10 && rawPin.length === 6) {
          const phone = rawPhone.startsWith("91") ? rawPhone : `91${rawPhone.slice(-10)}`;
          
          leadsToInsert.push({
            name: rawName,
            phone: phone,
            pincode: rawPin,
            district: "Pending", // Temporarily disabled external API
            state: "In Review",   // Temporarily disabled external API
            areaType: rawPin.endsWith("0") || rawPin.endsWith("1") ? "City" : "Village",
            agentId: req.user.id,
            status: "pending",
            createdAt: new Date(),
          });
        }
      } catch (rowErr) {
        console.error("Row processing error:", rowErr.message);
      }
    }

    if (leadsToInsert.length === 0) {
      return res.status(400).json({ 
        message: "No valid data found. Ensure columns like 'pincode' (6 digits) and 'phone' are present." 
      });
    }

    // 3. Bulk insert safely
    console.log(`Saving ${leadsToInsert.length} leads to database...`);
    await Lead.insertMany(leadsToInsert, { ordered: false });

    // 4. Update agent stats
    const User = require("../models/User");
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { totalLeads: leadsToInsert.length }
    });

    res.json({ 
      message: "Upload successful", 
      count: leadsToInsert.length 
    });

  } catch (error) {
    console.log("UPLOAD ERROR:", error);
    res.status(500).json({ 
      error: "Internal Server Error during upload", 
      details: error.message 
    });
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
