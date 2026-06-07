import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Users, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="h-7 w-7" /> Transfers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Move athletes{isAdmin ? " and coaches" : ""} between branches.
        </p>
      </div>

      <Tabs defaultValue="athlete">
        <TabsList>
          <TabsTrigger value="athlete"><Users className="mr-2 h-4 w-4" />Athlete</TabsTrigger>
          {isAdmin && <TabsTrigger value="coach"><UserCog className="mr-2 h-4 w-4" />Coach</TabsTrigger>}
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="athlete" className="mt-4">
          <AthleteTransfer userId={user!.id} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="coach" className="mt-4">
            <CoachTransfer />
          </TabsContent>
        )}
        <TabsContent value="history" className="mt-4">
          <TransferHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useBranches() {
  return useQuery({
    queryKey: ["branches-min"],
    queryFn: async () => (await supabase.from("branches").select("id, code, name").order("name")).data ?? [],
  });
}

function AthleteTransfer({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: branches } = useBranches();
  const [athleteId, setAthleteId] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [reason, setReason] = useState("");

  const { data: athletes } = useQuery({
    queryKey: ["athletes-for-transfer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("athletes")
        .select("id, full_name, athlete_number, branch_id, branches(code, name)")
        .eq("active", true)
        .order("full_name");
      return data ?? [];
    },
  });

  const selected = useMemo(() => athletes?.find((a) => a.id === athleteId), [athletes, athleteId]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Pick an athlete");
      if (!toBranch) throw new Error("Pick a destination branch");
      if (toBranch === selected.branch_id) throw new Error("Athlete is already in that branch");

      const { error: e1 } = await supabase.from("athlete_transfers").insert({
        athlete_id: selected.id,
        from_branch_id: selected.branch_id,
        to_branch_id: toBranch,
        reason: reason || null,
        performed_by: userId,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("athletes").update({ branch_id: toBranch }).eq("id", selected.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Athlete transferred");
      setAthleteId(""); setToBranch(""); setReason("");
      qc.invalidateQueries({ queryKey: ["athletes-for-transfer"] });
      qc.invalidateQueries({ queryKey: ["transfer-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-5 space-y-4 max-w-2xl">
      <div>
        <Label>Athlete</Label>
        <Select value={athleteId} onValueChange={setAthleteId}>
          <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
          <SelectContent>
            {(athletes ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.athlete_number} — {a.full_name} ({a.branches?.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="text-muted-foreground">Current branch</div>
          <div className="font-medium">{selected.branches?.name} ({selected.branches?.code})</div>
        </div>
      )}

      <div>
        <Label>Destination branch</Label>
        <Select value={toBranch} onValueChange={setToBranch}>
          <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
          <SelectContent>
            {(branches ?? []).filter((b) => b.id !== selected?.branch_id).map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Reason</Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this athlete being transferred?" />
      </div>

      <Button onClick={() => submit.mutate()} disabled={submit.isPending || !athleteId || !toBranch}>
        <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer athlete
      </Button>
    </Card>
  );
}

function CoachTransfer() {
  const qc = useQueryClient();
  const { data: branches } = useBranches();
  const [coachId, setCoachId] = useState("");
  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");

  const { data: coaches } = useQuery({
    queryKey: ["coaches-with-branches"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "coach");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as any[];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const { data: assignments } = await supabase.from("branch_coaches").select("user_id, branch_id, branches(code, name)").in("user_id", ids);
      return (profs ?? []).map((p) => ({
        ...p,
        branches: (assignments ?? []).filter((a) => a.user_id === p.id).map((a) => a.branches).filter(Boolean),
        assignments: (assignments ?? []).filter((a) => a.user_id === p.id),
      }));
    },
  });

  const selected = useMemo(() => coaches?.find((c: any) => c.id === coachId), [coaches, coachId]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!coachId) throw new Error("Pick a coach");
      if (!fromBranch) throw new Error("Pick the current branch");
      if (!toBranch) throw new Error("Pick the destination branch");
      if (fromBranch === toBranch) throw new Error("Source and destination must differ");

      const { error: e1 } = await supabase
        .from("branch_coaches")
        .delete()
        .eq("user_id", coachId)
        .eq("branch_id", fromBranch);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("branch_coaches")
        .insert({ user_id: coachId, branch_id: toBranch });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Coach transferred");
      setCoachId(""); setFromBranch(""); setToBranch("");
      qc.invalidateQueries({ queryKey: ["coaches-with-branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-5 space-y-4 max-w-2xl">
      <div>
        <Label>Coach</Label>
        <Select value={coachId} onValueChange={(v) => { setCoachId(v); setFromBranch(""); }}>
          <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
          <SelectContent>
            {(coaches ?? []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <div className="text-muted-foreground">Current branches</div>
          <div className="font-medium">
            {selected.branches?.length
              ? selected.branches.map((b: any) => `${b.code} — ${b.name}`).join(", ")
              : "Not assigned to any branch"}
          </div>
        </div>
      )}

      <div>
        <Label>From branch</Label>
        <Select value={fromBranch} onValueChange={setFromBranch}>
          <SelectTrigger><SelectValue placeholder="Current branch" /></SelectTrigger>
          <SelectContent>
            {(selected?.assignments ?? []).map((a: any) => {
              const b = (branches ?? []).find((x) => x.id === a.branch_id);
              return b ? <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem> : null;
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>To branch</Label>
        <Select value={toBranch} onValueChange={setToBranch}>
          <SelectTrigger><SelectValue placeholder="Destination branch" /></SelectTrigger>
          <SelectContent>
            {(branches ?? []).filter((b) => b.id !== fromBranch).map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={() => submit.mutate()} disabled={submit.isPending || !coachId || !fromBranch || !toBranch}>
        <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer coach
      </Button>
    </Card>
  );
}

function TransferHistory() {
  const { data } = useQuery({
    queryKey: ["transfer-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("athlete_transfers")
        .select("id, transfer_date, reason, athletes(full_name, athlete_number), from:from_branch_id(code, name), to:to_branch_id(code, name)")
        .order("transfer_date", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <Card className="p-5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2">Date</th><th>Athlete</th><th>From</th><th>To</th><th>Reason</th></tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).length === 0 && <tr><td colSpan={5} className="py-4 text-muted-foreground">No transfers yet.</td></tr>}
            {(data ?? []).map((t: any) => (
              <tr key={t.id}>
                <td className="py-2">{t.transfer_date}</td>
                <td>
                  <div className="font-medium">{t.athletes?.full_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{t.athletes?.athlete_number}</div>
                </td>
                <td>{t.from?.code ?? "—"}</td>
                <td className="font-medium">{t.to?.code ?? "—"}</td>
                <td className="text-muted-foreground">{t.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
