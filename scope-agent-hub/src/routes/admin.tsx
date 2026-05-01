import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession, useAgents, createAgent, deleteAgent, type Agent } from "@/lib/auth";
import { fetchGroupedLogs, deleteLogsByDate, fetchLeads, deleteLead, type GroupedLog, type Lead } from "@/lib/leads";
import { DashboardShell } from "@/components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Users, UserPlus, Phone, Target, Loader2, Trash2, History, ShieldAlert, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Scope Media Solution" }] }),
  component: AdminPage,
});

function AdminPage() {
  const session = useSession();
  const navigate = useNavigate();
  const agents = useAgents();
  const [groupedLogs, setGroupedLogs] = useState<GroupedLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [logsLoading, setLogsLoading] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadLogs = async () => {
    setLogsLoading(true);
    const data = await fetchGroupedLogs();
    if (data) setGroupedLogs(data);
    setLogsLoading(false);
  };

  const loadLeads = async () => {
    setLeadsLoading(true);
    const data = await fetchLeads(1, 100);
    if (data) setLeads(data.leads);
    setLeadsLoading(false);
  };

  useEffect(() => {
    if (isClient) {
      if (session === null) navigate({ to: "/" });
      else if (session && session.role !== "admin") navigate({ to: "/agent" });
      else {
        loadLogs();
        loadLeads();
      }
    }
  }, [session, navigate, isClient]);

  if (!isClient) return null;
  if (!session || session.role !== "admin") return null;

  const totalLeads = agents.reduce((s, a) => s + a.totalLeads, 0);
  const totalTricked = agents.reduce((s, a) => s + a.totalTricked, 0);

  const toggleExpand = (date: string) => {
    setExpandedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const handleDeleteLogs = async (date: string) => {
    if (!confirm(`Are you sure you want to delete ALL logs for ${date}?`)) return;
    setDeletingDate(date);
    const ok = await deleteLogsByDate(date);
    if (ok) {
      toast.success(`Cleared logs for ${date}`);
      loadLogs();
    } else {
      toast.error("Failed to delete logs");
    }
    setDeletingDate(null);
  };

  const handleDeleteLead = async (id: string) => {
    const reason = prompt("Enter reason for deleting this lead:");
    if (!reason) return;
    setDeletingLeadId(id);
    const res = await deleteLead(id, reason);
    if (res.ok) {
      toast.success("Lead deleted successfully");
      loadLeads();
      loadLogs();
    } else {
      toast.error(res.message);
    }
    setDeletingLeadId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email || !form.password) return toast.error("All fields required");
    
    setLoading(true);
    const res = await createAgent(name, email, form.password);
    setLoading(false);
    
    if (!res.ok) return toast.error(res.error || "Failed to create agent");
    
    toast.success(`Agent "${name}" created`);
    setForm({ name: "", email: "", password: "" });
    setOpen(false);
  };

  return (
    <DashboardShell session={session}>
      <Toaster richColors position="top-right" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Monitor system health and manage data.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg"><UserPlus className="w-4 h-4 mr-2" />Create Agent</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Agent</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              <Input placeholder="Password" type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <StatCard icon={<Users />} label="Total Agents" value={agents.length} />
        <StatCard icon={<Target />} label="Total Leads" value={totalLeads} />
        <StatCard icon={<Phone />} label="Total Tricked" value={totalTricked} />
      </div>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="leads"><FileText className="w-4 h-4 mr-2" /> All Leads</TabsTrigger>
          <TabsTrigger value="agents"><Users className="w-4 h-4 mr-2" /> Agents</TabsTrigger>
          <TabsTrigger value="logs" onClick={loadLogs}><History className="w-4 h-4 mr-2" /> Deleted Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <Card className="border-none shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>System Leads</CardTitle><CardDescription>Directly manage present leads.</CardDescription></div>
              <Button variant="outline" size="sm" onClick={loadLeads} disabled={leadsLoading}>
                {leadsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Agent</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {leads.map(l => (
                    <TableRow key={l._id}>
                      <TableCell className="font-bold">{l.name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.phone}</TableCell>
                      <TableCell className="text-xs">{l.agentId}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDeleteLead(l._id)} disabled={deletingLeadId === l._id}>
                          {deletingLeadId === l._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card className="border-none shadow-xl">
            <CardHeader><CardTitle>Agents Overview</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {agents.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-bold">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.email}</TableCell>
                      <TableCell className="text-right font-mono">{a.totalLeads}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="w-3 h-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <div className="space-y-4">
            {groupedLogs.map(group => (
              <Card key={group._id} className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-secondary/10 py-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(group._id)}>
                    {expandedDates.includes(group._id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <div className="flex flex-col">
                      <span className="font-bold text-lg">{new Date(group._id).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                      <span className="text-xs text-muted-foreground uppercase font-bold">{group.count} records deleted</span>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteLogs(group._id)} disabled={deletingDate === group._id} className="shadow-lg">
                    {deletingDate === group._id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete {group.count} Logs
                  </Button>
                </CardHeader>
                {expandedDates.includes(group._id) && (
                  <CardContent className="p-0 animate-in slide-in-from-top-2">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow><TableHead className="pl-14">Name</TableHead><TableHead>Phone</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Time</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.logs.map(log => (
                          <TableRow key={log._id} className="hover:bg-muted/30">
                            <TableCell className="pl-14 font-medium">{log.name}</TableCell>
                            <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                            <TableCell><span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">{log.reason}</span></TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{new Date(log.deletedAt).toLocaleTimeString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="border-none shadow-lg group hover:shadow-xl transition-all">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase">{label}</div>
          <div className="text-3xl font-black mt-1">{value}</div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">{icon}</div>
      </CardContent>
    </Card>
  );
}