import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";
import { setSession, type Session } from "@/lib/auth";

export function DashboardShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const navigate = useNavigate();
  const handleLogout = () => {
    setSession(null);
    navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold leading-tight">Scope Media Solution</div>
              <div className="text-xs text-muted-foreground capitalize">{session.role} panel</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{session.name}</div>
              <div className="text-xs text-muted-foreground">{session.email}</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}