const Lead = require("../models/Lead");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const axios = require("axios");

const twilio = require("twilio");
const axios = require("axios");

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
    const uniquePincodes = [...new Set(rawData.map(r => String(r.pincode || r.Pincode || "").trim()))].filter(p => p.length === 6);

    console.log(`Processing ${rawData.length} rows with ${uniquePincodes.length} unique pincodes...`);

    // Pre-fetch pincode data for all unique pincodes in the file
    for (const pin of uniquePincodes) {
      await getPincodeData(pin);
    }

    for (const row of rawData) {
      const pin = String(row.pincode || row.Pincode || "").trim();
      const pinData = await getPincodeData(pin);
      
      const phone = String(row.phone || row.Phone || row.Mobile || "").trim().replace(/\D/g, "");
      
      if (phone.length >= 10) {
        leadsToInsert.push({
          name: (row.name || row.Name || "Unknown").trim(),
          phone: phone.startsWith("91") ? phone : `91${phone.slice(-10)}`,
          pincode: pin,
          district: pinData.district,
          state: pinData.state,
          areaType: pinData.areaType,
          agentId: req.user.id,
          status: "pending",
          createdAt: new Date(),
        });
      }
    }

    if (leadsToInsert.length === 0) {
      return res.status(400).json({ message: "No valid data found in file (ensure phone and 6-digit pincode are present)" });
    }

    console.log(`Saving ${leadsToInsert.length} leads to database... Example:`, leadsToInsert[0]);
    await Lead.insertMany(leadsToInsert);

    res.status(201).json({ 
      message: `${leadsToInsert.length} leads uploaded successfully`,
      count: leadsToInsert.length 
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
