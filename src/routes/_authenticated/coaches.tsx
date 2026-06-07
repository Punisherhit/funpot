import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { createCoachAccount } from "@/lib/coaches.functions";

export const Route = createFileRoute("/_authenticated/coaches")({
  component: CoachesPage,
});

function CoachesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [assignUser, setAssignUser] = useState("");
  const [assignBranch, setAssignBranch] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const createFn = useServerFn(createCoachAccount);

  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email").order("full_name")).data ?? [],
  });
  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });
  const { data: branches } = useQuery({
    queryKey: ["branches-min"],
    queryFn: async () => (await supabase.from("branches").select("id, code, name").order("name")).data ?? [],
  });
  const { data: assignments } = useQuery({
    queryKey: ["branch-coaches"],
    queryFn: async () => (await supabase.from("branch_coaches").select("user_id, branch_id, branches(code, name)")).data ?? [],
  });

  const roleOf = (uid: string) => (roles ?? []).filter((r) => r.user_id === uid).map((r) => r.role).join(", ");
  const branchesOf = (uid: string) => (assignments ?? []).filter((a) => a.user_id === uid);

  const assign = useMutation({
    mutationFn: async () => {
      if (!assignUser || !assignBranch) throw new Error("Pick coach and branch");
      const { error } = await supabase.from("branch_coaches").insert({ user_id: assignUser, branch_id: assignBranch });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assigned"); qc.invalidateQueries({ queryKey: ["branch-coaches"] }); setAssignUser(""); setAssignBranch(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const unassign = useMutation({
    mutationFn: async ({ uid, bid }: { uid: string; bid: string }) => {
      const { error } = await supabase.from("branch_coaches").delete().eq("user_id", uid).eq("branch_id", bid);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["branch-coaches"] }); },
  });

  const createCoach = useMutation({
    mutationFn: async () => {
      return await createFn({ data: { email: newEmail, password: newPassword, fullName: newName } });
    },
    onSuccess: () => {
      toast.success("Coach account created");
      setNewName(""); setNewEmail(""); setNewPassword("");
      qc.invalidateQueries({ queryKey: ["profiles-all"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return <div className="text-muted-foreground">Admin only.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coaches</h1>
        <p className="text-muted-foreground">Manage role-based access and branch assignments</p>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Assign coach to branch</h2>
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Coach</Label>
            <Select value={assignUser} onValueChange={setAssignUser}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>{(profiles ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={assignBranch} onValueChange={setAssignBranch}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{(branches ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => assign.mutate()} disabled={assign.isPending}>Assign</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Branches</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(profiles ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{roleOf(p.id) || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {branchesOf(p.id).map((a: any) => (
                      <span key={a.branch_id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {a.branches.code}
                        <button onClick={() => unassign.mutate({ uid: p.id, bid: a.branch_id })} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    {branchesOf(p.id).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
