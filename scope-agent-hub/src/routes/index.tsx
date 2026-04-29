import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { login, useSession, type Role } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Scope Media Solution" },
      { name: "description", content: "Sign in to Scope Media Solution lead management platform." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && session?.role === "admin") navigate({ to: "/admin" });
    else if (isClient && session?.role === "agent") navigate({ to: "/agent" });
  }, [session, navigate, isClient]);

  if (!isClient) return null;
  if (session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const s = await login(email.trim(), password, role);
    setLoading(false);
    if (!s) {
      toast.error("Invalid credentials", { description: role === "admin" ? "Check your admin email/password." : "No matching agent found." });
      return;
    }
    toast.success(`Welcome, ${s.name}`);
    navigate({ to: role === "admin" ? "/admin" : "/agent" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent/40 px-4 py-12">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-black overflow-hidden flex items-center justify-center border-2 border-primary/20 shadow-lg">
              <img src="/logo.png" alt="Scope Media Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Lead Management Platform
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Scope Media Solution</h1>
          <p className="text-sm text-muted-foreground mt-2 font-medium tracking-wide">Strategy. Growth. Results.</p>
        </div>

        <Card className="shadow-xl border-border/60">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Choose your role and enter your credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={(v) => setRole(v as Role)} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="agent">Agent</TabsTrigger>
              </TabsList>
              <TabsContent value="admin" className="text-xs text-muted-foreground mt-3">
                New here?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Create admin account
                </Link>
              </TabsContent>
              <TabsContent value="agent" className="text-xs text-muted-foreground mt-3">
                Use credentials created by your admin.
              </TabsContent>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@scope.com" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  `Sign in as ${role === "admin" ? "Admin" : "Agent"}`
                )}
              </Button>
            </form>
            {role === "admin" && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an admin account?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">Create one</Link>
              </p>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} Scope Media Solution</p>
      </div>
    </div>
  );
}
