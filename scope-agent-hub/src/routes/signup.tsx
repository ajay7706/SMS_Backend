import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { createAdmin } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create Admin — Scope Media Solution" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email || !form.password) return toast.error("All fields are required");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      const res = await createAdmin(name, email, form.password);
      setLoading(false);
      if (!res.ok) {
        toast.error(res.error || "Failed to create admin");
        return;
      }
      toast.success("Admin account created! Please sign in.");
      navigate({ to: "/" });
    } catch (err) {
      setLoading(false);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent/40 px-4 py-12">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Admin Setup
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Scope Media Solution</h1>
          <p className="text-sm text-muted-foreground mt-2">Create your admin account to get started</p>
        </div>

        <Card className="shadow-xl border-border/60">
          <CardHeader>
            <CardTitle>Create Admin Account</CardTitle>
            <CardDescription>Only admins can create agents and manage the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="admin@scope.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="min 6 characters" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Admin Account"
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}