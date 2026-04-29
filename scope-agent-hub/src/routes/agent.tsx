import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useSession, incrementAgentStats } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Upload, CheckCircle2, MessageCircle, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agent")({
  head: () => ({ meta: [{ title: "Agent Dashboard — Scope Media Solution" }] }),
  component: AgentPage,
});

type Lead = {
  id: string;
  name: string;
  mobile: string;
  pincode: string;
  type: string;
  tricked: boolean;
};

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    const nk = k.toLowerCase().replace(/[\s_-]/g, "");
    if (keys.some((t) => nk.includes(t))) {
      const v = row[k];
      if (v !== null && v !== undefined) return String(v);
    }
  }
  return "";
}

function AgentPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      if (session === null) navigate({ to: "/" });
      else if (session && session.role !== "agent") navigate({ to: "/admin" });
    }
  }, [session, navigate, isClient]);

  if (!isClient) return null;
  if (!session || session.role !== "agent") return null;

  const parseFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (!rows.length) return toast.error("File is empty");
      const parsed: Lead[] = rows.map((r, i) => ({
        id: `${Date.now()}-${i}`,
        name: pick(r, ["name"]) || "—",
        mobile: pick(r, ["mobile", "phone", "number", "contact"]),
        pincode: pick(r, ["pincode", "pin", "zip"]),
        type: (pick(r, ["type", "area", "location"]) || "City").toString(),
        tricked: false,
      }));
      setLeads(parsed);
      if (session.agentId) await incrementAgentStats(session.agentId, "totalLeads", parsed.length);
      toast.success(`Loaded ${parsed.length} leads`);
    } catch {
      toast.error("Failed to parse file. Use CSV or XLSX.");
    }
  };

  const handleTrick = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.tricked) return;

    if (session.agentId) {
      await incrementAgentStats(session.agentId, "totalTricked", 1);
    }

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        return { ...l, tricked: true };
      })
    );
  };

  const handleWhatsApp = (mobile: string, name: string) => {
    const clean = mobile.replace(/\D/g, "");
    if (!clean) return toast.error("Invalid mobile number");
    const text = encodeURIComponent(`Hello ${name}, this is ${session.name} from Scope Media Solution.`);
    window.open(`https://wa.me/${clean}?text=${text}`, "_blank");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  return (
    <DashboardShell session={session}>
      <Toaster richColors position="top-right" />
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome, {session.name}</h1>
        <p className="text-muted-foreground text-sm">Upload your leads and start working through them.</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" />Upload leads</CardTitle>
          <CardDescription>Supported: CSV, XLSX. Columns: Name, Mobile, Pincode, Type.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            <Upload className="w-10 h-10 mx-auto text-primary mb-3" />
            <div className="font-medium">Drop file here or click to browse</div>
            <div className="text-xs text-muted-foreground mt-1">CSV or XLSX up to a few MB</div>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); e.target.value = ""; }} />
          </div>
        </CardContent>
      </Card>

      {leads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leads ({leads.length})</CardTitle>
            <CardDescription>{leads.filter(l => l.tricked).length} tricked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id} className={cn(l.tricked && "bg-success/30 hover:bg-success/40")}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="font-mono text-sm">{l.mobile}</TableCell>
                      <TableCell>{l.pincode}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs font-medium">
                          {l.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant={l.tricked ? "secondary" : "default"} onClick={() => handleTrick(l.id)} disabled={l.tricked}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />{l.tricked ? "Tricked" : "Trick"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleWhatsApp(l.mobile, l.name)}>
                            <MessageCircle className="w-4 h-4 mr-1" />WhatsApp
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}