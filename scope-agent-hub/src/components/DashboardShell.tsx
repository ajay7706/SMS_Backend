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
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-black overflow-hidden flex items-center justify-center border border-primary/20">
              <img src="/logo.png" alt="Scope Media Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight tracking-tight">Scope Media</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{session.role} portal</div>
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