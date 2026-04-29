import { ENDPOINTS } from "./api";
import { getSession } from "./auth";

export type Lead = {
  _id: string;
  name: string;
  phone: string;
  pincode: string;
  district?: string;
  state?: string;
  areaType: "City" | "Village";
  status: "pending" | "tracked";
  createdAt: string;
};

export type LeadsResponse = {
  leads: Lead[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
};

const API_URL = ENDPOINTS.USERS.replace("/users", "/leads");

export async function uploadLeads(file: File): Promise<{ ok: boolean; message: string }> {
  const session = getSession();
  if (!session) return { ok: false, message: "Unauthorized" };

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.message || "Upload failed" };
    return { ok: true, message: data.message };
  } catch (err) {
    return { ok: false, message: "Network error" };
  }
}

export async function fetchLeads(page: number = 1, limit: number = 10): Promise<LeadsResponse | null> {
  const session = getSession();
  if (!session) return null;

  try {
    const res = await fetch(`${API_URL}?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const data = await res.json();
    return res.ok ? data : null;
  } catch (err) {
    console.error("Fetch leads error:", err);
    return null;
  }
}

export async function trackLead(id: string): Promise<boolean> {
  const session = getSession();
  if (!session) return false;

  try {
    const res = await fetch(`${API_URL}/track/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function sendWhatsApp(phone: string, name: string): Promise<boolean> {
  const session = getSession();
  if (!session) return false;

  try {
    const res = await fetch(`${API_URL}/whatsapp`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}` 
      },
      body: JSON.stringify({ phone, name }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}
