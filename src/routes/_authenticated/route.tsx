import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Building2, ClipboardCheck, Award, Trophy,
  Wallet, ShoppingBag, ScrollText, UserCog, LogOut, Menu, X, ArrowRightLeft
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/branches", label: "Branches", icon: Building2 },
  { to: "/athletes", label: "Athletes", icon: Users },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/assessments", label: "Assessments", icon: Award },
  { to: "/transfers", label: "Transfers", icon: ArrowRightLeft },
  { to: "/competitions", label: "Competitions", icon: Trophy },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/merchandise", label: "Merchandise", icon: ShoppingBag },
] as const;

const ADMIN_NAV = [
  { to: "/coaches", label: "Coaches", icon: UserCog },
  { to: "/audit", label: "Audit Log", icon: ScrollText },
] as const;

function AuthedLayout() {
  const { isAdmin, user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground font-bold">F</div>
          <span className="font-semibold">Funpot</span>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setOpen(!open)} className="text-sidebar-foreground hover:bg-sidebar-accent">
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${open ? "block" : "hidden"} lg:block fixed lg:sticky top-0 left-0 z-20 h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground`}>
          <div className="flex h-full flex-col">
            <div className="hidden lg:flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground font-bold">F</div>
              <div>
                <div className="text-sm font-bold leading-tight">Funpot Skating</div>
                <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Club Management</div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-sidebar-accent text-sidebar-primary" }}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <div className="mt-4 mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Admin</div>
                  {ADMIN_NAV.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-sidebar-accent text-sidebar-primary" }}
                    >
                      <n.icon className="h-4 w-4" />
                      {n.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>

            <div className="border-t border-sidebar-border p-3">
              <div className="px-2 py-2 text-xs">
                <div className="font-medium truncate">{user?.email}</div>
                <div className="text-sidebar-foreground/60">{isAdmin ? "Super Admin" : "Coach"}</div>
              </div>
              <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
