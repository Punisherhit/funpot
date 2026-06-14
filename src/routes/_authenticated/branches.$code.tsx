import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { sendBranchFeeReminders } from "@/lib/fees.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Building2, Users, Wallet, Trophy, BellRing, Plus, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/branches/$code")({
  component: BranchDetail,
});

function BranchDetail() {
  const { code } = Route.useParams();
  const { user, isAdmin } = useAuth();

  const { data: branch, isLoading } = useQuery({
    queryKey: ["branch-by-code", code],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*").eq("code", code).maybeSingle();
      return data;
    },
  });

  // Authorize coach: must be assigned to this branch
  const { data: assignment } = useQuery({
    queryKey: ["my-assignment", user?.id, branch?.id],
    enabled: !!user?.id && !!branch?.id && !isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_coaches")
        .select("user_id")
        .eq("user_id", user!.id)
        .eq("branch_id", branch!.id)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!branch) return <div>Branch not found.</div>;
  if (!isAdmin && !assignment) {
    return (
      <Card className="p-6 text-sm">
        You don't have access to <b>{branch.name}</b>. Ask a super admin to assign you to this branch.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/branches" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" /> All branches
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 mt-1">
            <Building2 className="h-7 w-7" /> {branch.name}
            <span className="text-sm font-mono text-accent">{branch.code}</span>
          </h1>
          <p className="text-muted-foreground text-sm">{branch.location || "—"}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees"><Wallet className="mr-2 h-4 w-4" />Fees</TabsTrigger>
          <TabsTrigger value="reminders"><BellRing className="mr-2 h-4 w-4" />Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <BranchOverview branchId={branch.id} />
        </TabsContent>
        <TabsContent value="fees" className="mt-4">
          <BranchFees branchId={branch.id} branchName={branch.name} />
        </TabsContent>
        <TabsContent value="reminders" className="mt-4">
          <RemindersHistory branchId={branch.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BranchOverview({ branchId }: { branchId: string }) {
  const { data } = useQuery({
    queryKey: ["branch-overview", branchId],
    queryFn: async () => {
      const [athletes, coaches, payments, competitions, fees] = await Promise.all([
        supabase.from("athletes").select("id", { count: "exact", head: true }).eq("branch_id", branchId).eq("active", true),
        supabase.from("branch_coaches").select("user_id", { count: "exact", head: true }).eq("branch_id", branchId),
        supabase.from("payments").select("amount, athletes!inner(branch_id)").eq("athletes.branch_id", branchId),
        supabase.from("competitions").select("id", { count: "exact", head: true }).eq("branch_id", branchId),
        supabase.from("fee_invoices").select("amount_due, amount_paid, status").eq("branch_id", branchId),
      ]);
      const collected = (payments.data ?? []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
      const outstanding = (fees.data ?? []).reduce(
        (s: number, f: any) => (f.status === "paid" || f.status === "cancelled" ? s : s + (Number(f.amount_due) - Number(f.amount_paid))),
        0,
      );
      return {
        athletes: athletes.count ?? 0,
        coaches: coaches.count ?? 0,
        collected,
        competitions: competitions.count ?? 0,
        outstanding,
        invoices: fees.data?.length ?? 0,
      };
    },
  });

  const cards = [
    { label: "Active athletes", value: data?.athletes ?? 0, icon: Users },
    { label: "Coaches", value: data?.coaches ?? 0, icon: Users },
    { label: "Competitions", value: data?.competitions ?? 0, icon: Trophy },
    { label: "Collected (KES)", value: (data?.collected ?? 0).toLocaleString(), icon: Wallet },
    { label: "Outstanding (KES)", value: (data?.outstanding ?? 0).toLocaleString(), icon: Wallet },
    { label: "Invoices", value: data?.invoices ?? 0, icon: Wallet },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold">{c.value}</div>
        </Card>
      ))}
    </div>
  );
}

function BranchFees({ branchId, branchName }: { branchId: string; branchName: string }) {
  const qc = useQueryClient();
  const send = useServerFn(sendBranchFeeReminders);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    athlete_id: "",
    kind: "monthly",
    description: "",
    amount_due: "",
    amount_paid: "0",
    due_date: new Date().toISOString().slice(0, 10),
  });

  const { data: athletes } = useQuery({
    queryKey: ["branch-athletes", branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("athletes")
        .select("id, full_name, athlete_number")
        .eq("branch_id", branchId)
        .eq("active", true)
        .order("full_name");
      return data ?? [];
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["branch-fees", branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fee_invoices")
        .select("*, athletes(full_name, athlete_number, parent_email)")
        .eq("branch_id", branchId)
        .order("due_date", { ascending: false });
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const list = invoices ?? [];
    const out = list.reduce(
      (s: number, f: any) => (f.status === "paid" || f.status === "cancelled" ? s : s + (Number(f.amount_due) - Number(f.amount_paid))),
      0,
    );
    const paid = list.reduce((s: number, f: any) => s + Number(f.amount_paid), 0);
    return { out, paid, count: list.length };
  }, [invoices]);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fee_invoices").insert({
        athlete_id: form.athlete_id,
        branch_id: branchId,
        kind: form.kind,
        description: form.description || null,
        amount_due: Number(form.amount_due),
        amount_paid: Number(form.amount_paid || 0),
        due_date: form.due_date,
        status: Number(form.amount_paid) >= Number(form.amount_due) ? "paid" : Number(form.amount_paid) > 0 ? "partial" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invoice added");
      qc.invalidateQueries({ queryKey: ["branch-fees", branchId] });
      qc.invalidateQueries({ queryKey: ["branch-overview", branchId] });
      setOpen(false);
      setForm({ athlete_id: "", kind: "monthly", description: "", amount_due: "", amount_paid: "0", due_date: new Date().toISOString().slice(0, 10) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remind = useMutation({
    mutationFn: async () => send({ data: { branchId, trigger: "manual" } }),
    onSuccess: (r) => {
      toast.success(`Reminders: ${r.sent} sent, ${r.skipped} skipped, ${r.failed} failed (${r.totalParents} parents)`);
      qc.invalidateQueries({ queryKey: ["branch-reminders", branchId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Invoices</div><div className="text-2xl font-bold mt-1">{totals.count}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Collected (KES)</div><div className="text-2xl font-bold mt-1">{totals.paid.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Outstanding (KES)</div><div className="text-2xl font-bold mt-1 text-destructive">{totals.out.toLocaleString()}</div></Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">{branchName} fees</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => remind.mutate()} disabled={remind.isPending}>
            <BellRing className="mr-2 h-4 w-4" />
            {remind.isPending ? "Sending…" : "Send reminders to parents"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add invoice</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New fee invoice</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Athlete</Label>
                  <Select value={form.athlete_id} onValueChange={(v) => setForm({ ...form, athlete_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                    <SelectContent>
                      {(athletes ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.athlete_number} — {a.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly fee</SelectItem>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. November 2026" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Amount due</Label><Input type="number" value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: e.target.value })} /></div>
                  <div><Label>Paid</Label><Input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></div>
                </div>
                <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={!form.athlete_id || !form.amount_due || create.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr>
              <th className="p-3">Athlete</th>
              <th className="p-3">Type</th>
              <th className="p-3">Description</th>
              <th className="p-3">Due</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right">Balance</th>
              <th className="p-3">Status</th>
              <th className="p-3">Parent email</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(invoices ?? []).length === 0 && (
              <tr><td colSpan={9} className="p-4 text-muted-foreground">No invoices yet.</td></tr>
            )}
            {(invoices ?? []).map((f: any) => {
              const bal = Number(f.amount_due) - Number(f.amount_paid);
              return (
                <tr key={f.id}>
                  <td className="p-3">
                    <div className="font-medium">{f.athletes?.full_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{f.athletes?.athlete_number}</div>
                  </td>
                  <td className="p-3 capitalize">{f.kind}</td>
                  <td className="p-3 text-muted-foreground">{f.description || "—"}</td>
                  <td className="p-3">{f.due_date}</td>
                  <td className="p-3 text-right">{Number(f.amount_due).toLocaleString()}</td>
                  <td className="p-3 text-right">{Number(f.amount_paid).toLocaleString()}</td>
                  <td className={`p-3 text-right font-medium ${bal > 0 ? "text-destructive" : ""}`}>{bal.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      f.status === "paid" ? "bg-success/15 text-success" :
                      f.status === "overdue" ? "bg-destructive/15 text-destructive" :
                      f.status === "partial" ? "bg-warning/15 text-warning" :
                      "bg-secondary"
                    }`}>{f.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{f.athletes?.parent_email || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function RemindersHistory({ branchId }: { branchId: string }) {
  const { data } = useQuery({
    queryKey: ["branch-reminders", branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reminder_logs")
        .select("*, athletes(full_name, athlete_number)")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <Card className="p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr>
            <th className="p-3">When</th>
            <th className="p-3">Athlete</th>
            <th className="p-3">Parent email</th>
            <th className="p-3 text-right">Outstanding</th>
            <th className="p-3">Trigger</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(data ?? []).length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground">No reminders sent yet.</td></tr>}
          {(data ?? []).map((r: any) => (
            <tr key={r.id}>
              <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-3">{r.athletes?.full_name || "—"}</td>
              <td className="p-3 text-xs">{r.parent_email}</td>
              <td className="p-3 text-right">{Number(r.total_outstanding).toLocaleString()}</td>
              <td className="p-3 capitalize">{r.trigger}</td>
              <td className="p-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.status === "sent" ? "bg-success/15 text-success" :
                  r.status === "failed" ? "bg-destructive/15 text-destructive" :
                  "bg-secondary"
                }`}>{r.status}</span>
                {r.error && <div className="text-xs text-destructive mt-1">{r.error}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
