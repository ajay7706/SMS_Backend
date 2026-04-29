import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSession, incrementAgentStats } from "@/lib/auth";
import { fetchLeads, uploadLeads, trackLead, sendWhatsApp, type Lead } from "@/lib/leads";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Upload, CheckCircle2, MessageCircle, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agent")({
  head: () => ({ meta: [{ title: "Agent Dashboard — Scope Media Solution" }] }),
  component: AgentPage,
});

function AgentPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [whatsappingId, setWhatsappingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadLeads = async (page: number) => {
    setLoading(true);
    const data = await fetchLeads(page, 15);
    if (data) {
      setLeads(data.leads);
      setPagination(data.pagination);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isClient) {
      if (session === null) navigate({ to: "/" });
      else if (session && session.role !== "agent") navigate({ to: "/admin" });
      else loadLeads(1);
    }
  }, [session, navigate, isClient]);

  if (!isClient) return null;
  if (!session || session.role !== "agent") return null;

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const res = await uploadLeads(file);
    if (res.ok) {
      toast.success(res.message);
      loadLeads(1);
    } else {
      toast.error(res.message);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleTrack = async (id: string) => {
    setTrackingId(id);
    const ok = await trackLead(id);
    if (ok) {
      toast.success("Lead marked as tracked");
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status: "tracked" } : l));
      if (session.agentId) {
        await incrementAgentStats(session.agentId, "totalTricked", 1);
      }
    } else {
      toast.error("Failed to update status");
    }
    setTrackingId(null);
  };

  const handleWhatsApp = async (id: string, phone: string, name: string) => {
    setWhatsappingId(id);
    const res = await sendWhatsApp(phone, name);
    if (res) {
      toast.success("WhatsApp message sent successfully via API");
    } else {
      toast.error("Failed to send WhatsApp message");
    }
    setWhatsappingId(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileUpload(f);
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
          <CardDescription>Supported: CSV, XLSX. Max 14k rows. Automatically deleted after 14 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/50",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <Loader2 className="w-10 h-10 mx-auto text-primary mb-3 animate-spin" />
            ) : (
              <Upload className="w-10 h-10 mx-auto text-primary mb-3" />
            )}
            <div className="font-medium">{uploading ? "Processing file..." : "Drop file here or click to browse"}</div>
            <div className="text-xs text-muted-foreground mt-1">CSV or XLSX (Name, Phone, Pincode)</div>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Leads Management</CardTitle>
            <CardDescription>Track status and contact leads via WhatsApp.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadLeads(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium">Page {pagination.page} of {pagination.pages}</span>
            <Button variant="outline" size="sm" onClick={() => loadLeads(pagination.page + 1)} disabled={pagination.page >= pagination.pages || loading}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Pincode</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Area Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No leads found. Upload a file to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((l) => (
                    <TableRow key={l._id} className={cn(l.status === "tracked" && "bg-success/10")}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="font-mono text-sm">{l.phone}</TableCell>
                      <TableCell>{l.pincode}</TableCell>
                      <TableCell className="text-muted-foreground">{l.district || "—"}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                          l.areaType === "City" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {l.areaType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
                          l.status === "tracked" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant={l.status === "tracked" ? "secondary" : "default"} onClick={() => handleTrack(l._id)} disabled={l.status === "tracked" || trackingId === l._id}>
                            {trackingId === l._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                            {l.status === "tracked" ? "Tracked" : trackingId === l._id ? "Tracking..." : "Track"}
                          </Button>
                          <Button size="sm" variant="outline" className="border-success/50 hover:bg-success/10 text-success-foreground" onClick={() => handleWhatsApp(l._id, l.phone, l.name)} disabled={whatsappingId === l._id}>
                            {whatsappingId === l._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                            {whatsappingId === l._id ? "Sending..." : "WhatsApp"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}