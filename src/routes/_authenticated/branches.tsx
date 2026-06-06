import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/branches")({
  component: BranchesPage,
});

function BranchesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", location: "" });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*, athletes(count)").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branches").insert({
        name: form.name,
        code: form.code.toUpperCase(),
        location: form.location || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch created");
      qc.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
      setForm({ name: "", code: "", location: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground">Manage club locations</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add branch</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New branch</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Code (3 letters, e.g. HLA)</Label><Input maxLength={5} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={!form.name || !form.code || create.isPending}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(branches ?? []).map((b: any) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono font-semibold text-accent tracking-wider">{b.code}</div>
                <div className="mt-1 text-lg font-semibold">{b.name}</div>
                <div className="text-sm text-muted-foreground">{b.location || "—"}</div>
              </div>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                {b.athletes?.[0]?.count ?? 0} athletes
              </span>
              {b.active ? <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">Active</span> : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
