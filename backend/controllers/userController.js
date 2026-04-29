const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Get all agents
exports.getAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent", deletedAt: null }).select("-password");
    // Map _id to id for frontend
    const mappedAgents = agents.map(a => ({
      id: a._id,
      name: a.name,
      email: a.email,
      totalLeads: a.totalLeads,
      totalTricked: a.totalTricked,
      createdAt: a.createdAt
    }));
    res.json(mappedAgents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create an agent (Admin only)
exports.createAgent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Agent with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "agent",
    });

    res.status(201).json({ 
      message: "Agent created successfully", 
      agent: {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        totalLeads: agent.totalLeads,
        totalTricked: agent.totalTricked
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update agent stats
exports.updateStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, by } = req.body; // field: 'totalLeads' or 'totalTricked'

    if (!["totalLeads", "totalTricked"].includes(field)) {
      return res.status(400).json({ message: "Invalid field" });
    }

    const agent = await User.findById(id);
    if (!agent || agent.role !== "agent") {
      return res.status(404).json({ message: "Agent not found" });
    }

    agent[field] = Math.max(0, agent[field] + (by || 1));
    await agent.save();
    
    res.json({ message: "Stats updated", stats: { totalLeads: agent.totalLeads, totalTricked: agent.totalTricked } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Soft delete agent (Admin only)
exports.deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await User.findById(id);
    if (!agent || agent.role !== "agent") {
      return res.status(404).json({ message: "Agent not found" });
    }

    agent.deletedAt = new Date(); // This triggers the 24h TTL index
    await agent.save();

    res.json({ message: "Agent scheduled for deletion in 24 hours" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
