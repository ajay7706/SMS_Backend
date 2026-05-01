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
  [key: string]: any; // Allow dynamic fields
};

export type DeletedLog = {
  _id: string;
  name: string;
  phone: string;
  reason: string;
  deletedByName: string;
  deletedAt: string;
  originalData?: any;
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

export async function fetchLeads(page: number = 1, limit: number = 20): Promise<LeadsResponse | null> {
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

export async function deleteLead(id: string, reason: string): Promise<{ ok: boolean; message: string }> {
  const session = getSession();
  if (!session) return { ok: false, message: "Unauthorized" };

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}` 
      },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    return { ok: res.ok, message: data.message || (res.ok ? "Deleted" : "Failed to delete") };
  } catch (err) {
    return { ok: false, message: "Network error" };
  }
}

export async function bulkDeleteLeads(ids: string[], reason: string): Promise<{ ok: boolean; message: string }> {
  const session = getSession();
  if (!session) return { ok: false, message: "Unauthorized" };

  try {
    const res = await fetch(`${API_URL}/bulk-delete`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}` 
      },
      body: JSON.stringify({ ids, reason }),
    });
    const data = await res.json();
    return { ok: res.ok, message: data.message || (res.ok ? "Bulk delete successful" : "Bulk delete failed") };
  } catch (err) {
    return { ok: false, message: "Network error" };
  }
}


export async function fetchDeletedLogs(): Promise<DeletedLog[] | null> {
  const session = getSession();
  if (!session) return null;

  try {
    const res = await fetch(`${API_URL}/logs`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const data = await res.json();
    return res.ok ? data : null;
  } catch (err) {
    return null;
  }
}

export type GroupedLog = {
  _id: string; // Date
  count: number;
  logs: DeletedLog[];
};

export async function fetchGroupedLogs(): Promise<GroupedLog[] | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const res = await fetch(`${API_URL}/logs/grouped`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });
    const data = await res.json();
    return res.ok ? data : null;
  } catch (err) { return null; }
}

export async function deleteLogsByDate(date: string): Promise<boolean> {
  const session = getSession();
  if (!session) return false;
  try {
    const res = await fetch(`${API_URL}/logs/delete-day`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}` 
      },
      body: JSON.stringify({ date }),
    });
    return res.ok;
  } catch (err) { return false; }
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
