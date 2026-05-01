import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSession, incrementAgentStats } from "@/lib/auth";
import { fetchLeads, uploadLeads, trackLead, sendWhatsApp, deleteLead, bulkDeleteLeads, type Lead } from "@/lib/leads";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Upload, CheckCircle2, MessageCircle, FileSpreadsheet, Loader2, ChevronLeft, ChevronRight, Trash2, X, Filter, Trash, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  
  // Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadLeads = async (page: number) => {
    setLoading(true);
    const data = await fetchLeads(page, 20);
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
      toast.success("WhatsApp message sent successfully");
    } else {
      toast.error("Failed to send WhatsApp message");
    }
    setWhatsappingId(null);
  };

  const openDeleteDialog = (lead: Lead) => {
    setLeadToDelete(lead);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!leadToDelete || !deleteReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setDeletingId(leadToDelete._id);
    const res = await deleteLead(leadToDelete._id, deleteReason);
    if (res.ok) {
      toast.success(res.message || "Lead deleted and logged");
      setLeads(prev => prev.filter(l => l._id !== leadToDelete._id));
      setIsDeleteDialogOpen(false);
      setDeleteReason("");
      setLeadToDelete(null);
    } else {
      toast.error(res.message || "Failed to delete lead");
    }

    setDeletingId(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !deleteReason.trim()) {
      toast.error("Please select items and provide a reason");
      return;
    }
    
    setIsBulkDeleting(true);
    const res = await bulkDeleteLeads(selectedIds, deleteReason);
    
    if (res.ok) {
      toast.success(res.message);
      setIsBulkDeleteDialogOpen(false);
      setSelectedIds([]);
      setDeleteReason("");
      loadLeads(pagination.page);
    } else {
      toast.error(res.message);
    }
    setIsBulkDeleting(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map(l => l._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Dynamic Column Detection
  const getDynamicColumns = () => {
    if (leads.length === 0) return [];
    const internalFields = ["_id", "agentId", "status", "createdAt", "updatedAt", "__v", "district", "state", "areaType", "name", "phone", "pincode"];
    const allKeys = new Set<string>();
    leads.forEach(lead => {
      Object.keys(lead).forEach(key => {
        if (!internalFields.includes(key)) allKeys.add(key);
      });
    });
    return Array.from(allKeys);
  };

  const dynamicColumns = getDynamicColumns();

  return (
    <DashboardShell session={session}>
      <Toaster richColors position="top-right" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {session.name}</h1>
          <p className="text-muted-foreground text-sm">Managing {pagination.total} total leads.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={() => setIsBulkDeleteDialogOpen(true)} className="animate-in fade-in slide-in-from-right-4">
              <Trash className="w-4 h-4 mr-2" /> Delete {selectedIds.length} Selected
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <Card className="lg:col-span-1 border-none shadow-xl bg-gradient-to-br from-card to-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-primary" />Upload Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f); }}
              onClick={() => !uploading && inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300",
                dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-secondary/50",
                uploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {uploading ? <Loader2 className="w-8 h-8 mx-auto text-primary mb-3 animate-spin" /> : <Upload className="w-8 h-8 mx-auto text-primary mb-3" />}
              <div className="font-semibold text-sm">{uploading ? "Processing..." : "Click to upload"}</div>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-secondary/10 py-4">
            <div>
              <CardTitle>Leads Table</CardTitle>
            </div>
            <div className="flex items-center gap-2 bg-background p-1 rounded-lg border">
              <Button variant="ghost" size="sm" onClick={() => loadLeads(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold px-2">Page {pagination.page} of {pagination.pages}</span>
              <Button variant="ghost" size="sm" onClick={() => loadLeads(pagination.page + 1)} disabled={pagination.page >= pagination.pages || loading}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary/5">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={selectedIds.length === leads.length && leads.length > 0} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Pin</TableHead>
                    {dynamicColumns.map(col => <TableHead key={col} className="capitalize">{col}</TableHead>)}
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" /></TableCell></TableRow>
                  ) : leads.map((l, idx) => (
                    <TableRow key={l._id} className={cn("hover:bg-muted/50 transition-colors", selectedIds.includes(l._id) && "bg-primary/5", l.status === "tracked" && "bg-success/5 opacity-80")}>
                      <TableCell><Checkbox checked={selectedIds.includes(l._id)} onCheckedChange={() => toggleSelect(l._id)} /></TableCell>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.phone}</TableCell>
                      <TableCell className="font-mono text-xs">{l.pincode}</TableCell>
                      {dynamicColumns.map(col => <TableCell key={col} className="text-sm">{String(l[col] || "—")}</TableCell>)}
                      <TableCell>
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">{l.district || l.state ? `${l.district}, ${l.state}` : "—"}</div>
                        <div className={cn("text-[9px] font-black uppercase mt-0.5", l.areaType === "City" ? "text-blue-500" : "text-amber-600")}>{l.areaType}</div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                          l.status === "tracked" ? "bg-success text-success-foreground" : "bg-secondary text-secondary-foreground"
                        )}>
                          {l.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant={l.status === "tracked" ? "secondary" : "default"} onClick={() => handleTrack(l._id)} disabled={l.status === "tracked" || trackingId === l._id} className="h-8 gap-1 px-3">
                            {trackingId === l._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span className="text-[10px] font-bold">Track</span>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => handleWhatsApp(l._id, l.phone, l.name)} disabled={whatsappingId === l._id}>
                            {whatsappingId === l._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(l)}>
                            <Trash2 className="w-3 h-3" />
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
      </div>

      {/* Delete Single Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Delete Lead</DialogTitle><DialogDescription>Reason is required for auditing.</DialogDescription></DialogHeader>
          <div className="py-4"><Input placeholder="Reason..." value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!deleteReason.trim() || !!deletingId}>
              {deletingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Bulk Delete</DialogTitle><DialogDescription>Delete {selectedIds.length} leads?</DialogDescription></DialogHeader>
          <div className="py-4"><Input placeholder="Reason for bulk delete..." value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={!deleteReason.trim() || isBulkDeleting}>
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}