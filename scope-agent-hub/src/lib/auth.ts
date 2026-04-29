import { useEffect, useState } from "react";

export type Role = "admin" | "agent";

export type Agent = {
  id: string;
  name: string;
  email: string;
  password: string;
  totalLeads: number;
  totalTricked: number;
};

export type Admin = { id: string; name: string; email: string; password: string };
export type Session = { role: Role; name: string; email: string; token: string; agentId?: string };

const SESSION_KEY = "sms_session";
const AGENTS_KEY = "sms_agents";
const ADMINS_KEY = "sms_admins";
const API_URL = "http://localhost:5000/api/auth";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("sms-session"));
}

export function getAgents(): Agent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(AGENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveAgents(agents: Agent[]) {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
  window.dispatchEvent(new Event("sms-agents"));
}

export function getAdmins(): Admin[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ADMINS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveAdmins(admins: Admin[]) {
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
}

export async function createAdmin(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "admin" }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.message || data.error || "Signup failed" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Network error" };
  }
}

export function hasAnyAdmin(): boolean {
  return getAdmins().length > 0;
}

export async function login(email: string, password: string, role: Role): Promise<Session | null> {
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return null;

    const s: Session = {
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      token: data.token,
      agentId: data.user.id,
    };
    setSession(s);
    return s;
  } catch (err) {
    console.error("Login error:", err);
    return null;
  }
}

export function useSession() {
  const [session, setState] = useState<Session | null>(null);

  useEffect(() => {
    // Initial load
    setState(getSession());

    const h = () => setState(getSession());
    window.addEventListener("sms-session", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("sms-session", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return session;
}

const USERS_URL = "http://localhost:5000/api/users";

export function useAgents() {
  const [agents, setState] = useState<Agent[]>([]);
  const session = getSession();

  useEffect(() => {
    if (!session || session.role !== "admin") return;

    const fetchAgents = async () => {
      try {
        const res = await fetch(`${USERS_URL}/agents`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        const data = await res.json();
        if (res.ok) setState(data);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      }
    };

    fetchAgents();
    window.addEventListener("sms-agents", fetchAgents);
    return () => window.removeEventListener("sms-agents", fetchAgents);
  }, []);

  return agents;
}

export async function createAgent(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const session = getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Unauthorized" };

  try {
    const res = await fetch(`${USERS_URL}/agents`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}` 
      },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.message || "Failed to create agent" };
    window.dispatchEvent(new Event("sms-agents"));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Network error" };
  }
}

export async function incrementAgentStats(agentId: string, field: "totalLeads" | "totalTricked", by: number) {
  const session = getSession();
  if (!session) return;

  try {
    await fetch(`${USERS_URL}/agents/${agentId}/stats`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}` 
      },
      body: JSON.stringify({ field, by }),
    });
  } catch (err) {
    console.error("Failed to update stats:", err);
  }
}

export async function deleteAgent(agentId: string): Promise<{ ok: boolean; error?: string }> {
  const session = getSession();
  if (!session || session.role !== "admin") return { ok: false, error: "Unauthorized" };

  try {
    const res = await fetch(`${USERS_URL}/agents/${agentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.message || "Failed to delete agent" };
    window.dispatchEvent(new Event("sms-agents"));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Network error" };
  }
}

export async function resetPassword(email: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.message || "Reset failed" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Network error" };
  }
}
