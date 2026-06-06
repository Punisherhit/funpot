import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Users, Building2, ClipboardCheck, Wallet, Trophy, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${accent ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { isAdmin, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [athletes, branches, sessions, payments, comps] = await Promise.all([
        supabase.from("athletes").select("id, branch_id, active", { count: "exact" }),
        supabase.from("branches").select("id, name", { count: "exact" }),
        supabase.from("training_sessions").select("id", { count: "exact" }).gte("session_date", new Date().toISOString().slice(0, 10)),
        supabase.from("payments").select("amount, payment_date"),
        supabase.from("competitions").select("id, competition_date").gte("competition_date", new Date().toISOString().slice(0, 10)),
      ]);

      const totalRevenue = (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const byBranch: Record<string, number> = {};
      (athletes.data ?? []).forEach((a) => { if (a.branch_id) byBranch[a.branch_id] = (byBranch[a.branch_id] ?? 0) + 1; });
      const branchChart = (branches.data ?? []).map((b) => ({ name: b.name, athletes: byBranch[b.id] ?? 0 }));

      return {
        athleteCount: athletes.count ?? 0,
        activeAthletes: (athletes.data ?? []).filter((a) => a.active).length,
        branchCount: branches.count ?? 0,
        upcomingSessions: sessions.count ?? 0,
        totalRevenue,
        upcomingComps: comps.count ?? 0,
        branchChart,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isAdmin ? "Admin Dashboard" : "Coach Dashboard"}</h1>
        <p className="text-muted-foreground">Welcome back, {user?.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Athletes" value={stats?.athleteCount ?? "—"} />
        <Stat icon={Building2} label="Branches" value={stats?.branchCount ?? "—"} accent="bg-accent/15 text-accent" />
        <Stat icon={ClipboardCheck} label="Upcoming sessions" value={stats?.upcomingSessions ?? "—"} accent="bg-success/15 text-success" />
        <Stat icon={Wallet} label="Total revenue" value={stats ? `KES ${stats.totalRevenue.toLocaleString()}` : "—"} accent="bg-warning/20 text-warning-foreground" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Athletes per branch</h2>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={stats?.branchChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="athletes" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Quick stats</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Active athletes</span><span className="font-semibold">{stats?.activeAthletes ?? "—"}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Upcoming competitions</span><span className="font-semibold">{stats?.upcomingComps ?? "—"}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Registration fee</span><span className="font-semibold">KES 1,000</span></li>
          </ul>
          <div className="mt-6 rounded-lg bg-accent/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Award className="h-4 w-4" /> Ranking formula</div>
            <p className="mt-1 text-xs text-muted-foreground">70% assessment · 20% attendance · 10% competition</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
