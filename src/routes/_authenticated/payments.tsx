import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    athlete_id: "", amount: 1000, payment_type: "registration" as const, payment_method: "mpesa" as const,
    reference: "", payment_date: new Date().toISOString().slice(0, 10), notes: "",
  });

  const { data: athletes } = useQuery({
    queryKey: ["athletes-min"],
    queryFn: async () => (await supabase.from("athletes").select("id, athlete_number, full_name").order("full_name")).data ?? [],
  });

  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await supabase.from("payments").select("*, athletes(full_name, athlete_number)").order("payment_date", { ascending: false }).limit(100)).data ?? [],
  });

  const total = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.athlete_id) throw new Error("Pick an athlete");
      const { error } = await supabase.from("payments").insert({
        athlete_id: form.athlete_id, amount: form.amount, payment_type: form.payment_type, payment_method: form.payment_method,
        reference: form.reference || null, payment_date: form.payment_date, notes: form.notes || null, recorded_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payment recorded"); qc.invalidateQueries({ queryKey: ["payments"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Total recorded: <span className="font-semibold text-foreground">KES {total.toLocaleString()}</span></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record payment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Athlete</Label>
                <Select value={form.athlete_id} onValueChange={(v) => setForm({ ...form, athlete_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                  <SelectContent>{(athletes ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.athlete_number} — {a.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.payment_type} onValueChange={(v: any) => setForm({ ...form, payment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registration">Registration (KES 1,000/yr)</SelectItem>
                      <SelectItem value="monthly">Monthly fees</SelectItem>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="merchandise">Merchandise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={form.payment_method} onValueChange={(v: any) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount (KES)</Label><Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div><Label>Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
              </div>
              <div><Label>M-Pesa / receipt reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Athlete</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Reference</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(payments ?? []).length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments yet.</td></tr>}
              {(payments ?? []).map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">{p.payment_date}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.athletes?.full_name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{p.athletes?.athlete_number}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{p.payment_type}</td>
                  <td className="px-4 py-3 uppercase text-muted-foreground">{p.payment_method}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.reference || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">KES {Number(p.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
