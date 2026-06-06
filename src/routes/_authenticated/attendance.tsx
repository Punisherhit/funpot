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
import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

const STATUSES: Array<"present" | "absent" | "late" | "excused"> = ["present", "absent", "late", "excused"];

function AttendancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openSession, setOpenSession] = useState<string | null>(null);

  const { data: sessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("training_sessions")
        .select("id, session_date, start_time, end_time, title, branch_id, branches(name, code)")
        .order("session_date", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Training sessions and roll calls</p>
        </div>
        <NewSessionDialog userId={user!.id} onDone={() => qc.invalidateQueries({ queryKey: ["sessions"] })} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Branch</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(sessions ?? []).length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No sessions yet.</td></tr>
              )}
              {(sessions ?? []).map((s: any) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{s.session_date}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.branches?.name}</td>
                  <td className="px-4 py-3">{s.title || "Session"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.start_time ?? "—"} {s.end_time ? `– ${s.end_time}` : ""}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setOpenSession(s.id)}>Mark attendance</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {openSession && <MarkAttendanceDialog sessionId={openSession} branchId={(sessions ?? []).find((s: any) => s.id === openSession)?.branch_id} userId={user!.id} onClose={() => setOpenSession(null)} />}
    </div>
  );
}

function NewSessionDialog({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ branch_id: "", session_date: new Date().toISOString().slice(0, 10), start_time: "", end_time: "", title: "" });
  const { data: branches } = useQuery({
    queryKey: ["branches-min"],
    queryFn: async () => (await supabase.from("branches").select("id, code, name").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("training_sessions").insert({ ...form, start_time: form.start_time || null, end_time: form.end_time || null, title: form.title || null, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session created"); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New session</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New training session</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Branch</Label>
            <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{(branches ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>End</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Morning practice" /></div>
        </div>
        <DialogFooter><Button onClick={() => create.mutate()} disabled={!form.branch_id || create.isPending}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkAttendanceDialog({ sessionId, branchId, userId, onClose }: { sessionId: string; branchId: string; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: athletes } = useQuery({
    queryKey: ["athletes-branch", branchId],
    queryFn: async () => {
      const { data } = await supabase.from("athletes").select("id, athlete_number, full_name").eq("branch_id", branchId).eq("active", true).order("full_name");
      return data ?? [];
    },
  });
  const { data: existing } = useQuery({
    queryKey: ["attendance", sessionId],
    queryFn: async () => (await supabase.from("attendance").select("athlete_id, status").eq("session_id", sessionId)).data ?? [],
  });

  const [marks, setMarks] = useState<Record<string, "present" | "absent" | "late" | "excused">>({});
  const current = (id: string) => marks[id] ?? existing?.find((e) => e.athlete_id === id)?.status ?? "present";

  const save = useMutation({
    mutationFn: async () => {
      const rows = (athletes ?? []).map((a) => ({
        session_id: sessionId, athlete_id: a.id, status: current(a.id), marked_by: userId,
      }));
      const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "session_id,athlete_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Attendance saved"); qc.invalidateQueries({ queryKey: ["attendance", sessionId] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Mark attendance</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {(athletes ?? []).length === 0 && <p className="text-sm text-muted-foreground">No active athletes in this branch.</p>}
          {(athletes ?? []).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">{a.full_name}</div>
                <div className="text-xs font-mono text-muted-foreground">{a.athlete_number}</div>
              </div>
              <div className="flex gap-1">
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={current(a.id) === s ? "default" : "outline"}
                    onClick={() => setMarks({ ...marks, [a.id]: s })}
                    className="capitalize"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}><Check className="mr-2 h-4 w-4" />Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
