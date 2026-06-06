import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/competitions")({
  component: CompetitionsPage,
});

function CompetitionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", competition_date: "", location: "", branch_id: "", description: "" });

  const { data: branches } = useQuery({
    queryKey: ["branches-min"],
    queryFn: async () => (await supabase.from("branches").select("id, code, name").order("name")).data ?? [],
  });

  const { data: comps } = useQuery({
    queryKey: ["competitions"],
    queryFn: async () => {
      const { data } = await supabase.from("competitions").select("*, branches(name, code), competition_results(count)").order("competition_date", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("competitions").insert({
        name: form.name, competition_date: form.competition_date, location: form.location || null,
        branch_id: form.branch_id || null, description: form.description || null, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Competition created"); qc.invalidateQueries({ queryKey: ["competitions"] }); setOpen(false); setForm({ name: "", competition_date: "", location: "", branch_id: "", description: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitions</h1>
          <p className="text-muted-foreground">Track events and results</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New competition</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New competition</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Date *</Label><Input type="date" value={form.competition_date} onChange={(e) => setForm({ ...form, competition_date: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div>
                <Label>Branch (optional)</Label>
                <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Club-wide" /></SelectTrigger>
                  <SelectContent>{(branches ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={!form.name || !form.competition_date || create.isPending}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(comps ?? []).length === 0 && <Card className="p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">No competitions yet.</Card>}
        {(comps ?? []).map((c: any) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{c.competition_date}</div>
                <h3 className="mt-1 font-semibold">{c.name}</h3>
                <div className="text-sm text-muted-foreground">{c.location || "—"}</div>
              </div>
              <Trophy className="h-5 w-5 text-accent" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{c.competition_results?.[0]?.count ?? 0} results</span>
              {c.branches && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{c.branches.code}</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
