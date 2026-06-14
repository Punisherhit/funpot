import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, Users, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/branches")({
  component: BranchesPage,
});

function BranchesPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", location: "" });

  const { data: myBranches } = useQuery({
    queryKey: ["my-branches", user?.id],
    enabled: !!user?.id && !isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_coaches")
        .select("branches(id, code, name, location, active)")
        .eq("user_id", user!.id);
      return (data ?? []).map((r: any) => r.branches).filter(Boolean);
    },
  });

  const { data: allBranches } = useQuery({
    queryKey: ["branches"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*, athletes(count)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Coach with a single branch: auto-open it
  useEffect(() => {
    if (!isAdmin && myBranches && myBranches.length === 1) {
      navigate({ to: "/branches/$code", params: { code: myBranches[0].code }, replace: true });
    }
  }, [isAdmin, myBranches, navigate]);

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

  const list = isAdmin ? allBranches : myBranches;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "All club locations — click to open." : "Your assigned branches."}
          </p>
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

      {(!list || list.length === 0) && (
        <Card className="p-6 text-sm text-muted-foreground">
          {isAdmin ? "No branches yet." : "You haven't been assigned to a branch yet. Ask a super admin."}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(list ?? []).map((b: any) => (
          <Link key={b.id} to="/branches/$code" params={{ code: b.code }}>
            <Card className="p-5 hover:border-accent transition-colors cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold text-accent tracking-wider">{b.code}</div>
                  <div className="mt-1 text-lg font-semibold">{b.name}</div>
                  <div className="text-sm text-muted-foreground">{b.location || "—"}</div>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {b.athletes ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                      <Users className="h-3 w-3" /> {b.athletes?.[0]?.count ?? 0}
                    </span>
                  ) : null}
                  {b.active ? <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">Active</span> : null}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
