import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { setSession, type Session } from "@/lib/auth";
import { ScopeLogo } from "@/components/ScopeLogo";

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
          <Link to="/" className="flex items-center gap-3 group">
            <div className="transition-transform group-hover:scale-110">
              <ScopeLogo size={40} />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl leading-none tracking-tighter bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent uppercase">
                Scope Media
              </span>
              <span className="text-[9px] font-black tracking-[0.2em] text-primary uppercase mt-0.5">
                {session.role} portal
              </span>
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