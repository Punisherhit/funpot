import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, ArrowUpRight, MessageCircle, Award, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/athletes/$id")({
  component: AthleteDetail,
});

const LEVELS = ["beginner", "intermediate", "advanced", "elite"] as const;
const CATEGORIES = [
  ["balance_stability", "Balance & Stability"],
  ["speed_control", "Speed Control"],
  ["turning_technique", "Turning Technique"],
  ["endurance", "Endurance"],
  ["agility", "Agility"],
  ["race_skills", "Race Skills"],
  ["punctuality", "Punctuality"],
  ["consistency", "Consistency"],
  ["coachability", "Coachability"],
  ["team_spirit", "Team Spirit"],
  ["respect", "Respect"],
  ["strength", "Strength"],
  ["flexibility", "Flexibility"],
  ["stamina", "Stamina"],
] as const;

function AthleteDetail() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: athlete } = useQuery({
    queryKey: ["athlete", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select("*, branches(id, code, name)")
        .eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: assessments } = useQuery({
    queryKey: ["assessments", id],
    queryFn: async () => {
      const { data } = await supabase.from("assessments").select("*").eq("athlete_id", id).order("assessment_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: promotions } = useQuery({
    queryKey: ["promotions", id],
    queryFn: async () => {
      const { data } = await supabase.from("promotions").select("*").eq("athlete_id", id).order("promotion_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ["attendance-stats", id],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("status").eq("athlete_id", id);
      const total = data?.length ?? 0;
      const present = data?.filter((d) => d.status === "present" || d.status === "late").length ?? 0;
      return { total, present, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
    },
  });

  const trendData = (assessments ?? []).slice().reverse().map((a) => ({
    date: a.assessment_date,
    score: a.overall_score,
  }));

  // Ranking
  const lastAssessment = (assessments ?? [])[0]?.overall_score ?? 0;
  const attRate = attendanceStats?.rate ?? 0;
  const ranking = Math.round(lastAssessment * 0.7 + attRate * 0.2 + 0 * 0.1);

  if (!athlete) return <div className="text-muted-foreground">Loading…</div>;

  const waLink = athlete.parent_phone ? `https://wa.me/${athlete.parent_phone.replace(/\D/g, "")}` : null;

  return (
    <div className="space-y-6">
      <Link to="/athletes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to athletes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-accent tracking-wider">{athlete.athlete_number}</div>
          <h1 className="text-3xl font-bold tracking-tight">{athlete.full_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{athlete.branches?.name}</span>
            <span>·</span>
            <span className="capitalize">{athlete.discipline.replace("_", " ")}</span>
            <span>·</span>
            <span className="capitalize rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium">{athlete.current_level}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer">
              <Button variant="outline"><MessageCircle className="mr-2 h-4 w-4" />Contact parent</Button>
            </a>
          )}
          <AssessDialog athleteId={id} userId={user!.id} onDone={() => qc.invalidateQueries({ queryKey: ["assessments", id] })} />
          <PromoteDialog athleteId={id} userId={user!.id} currentLevel={athlete.current_level} onDone={() => {
            qc.invalidateQueries({ queryKey: ["athlete", id] });
            qc.invalidateQueries({ queryKey: ["promotions", id] });
          }} />
          {isAdmin && <TransferDialog athleteId={id} currentBranchId={athlete.branch_id} userId={user!.id} onDone={() => qc.invalidateQueries({ queryKey: ["athlete", id] })} />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Ranking</div><div className="mt-1 text-2xl font-bold">{ranking}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Last assessment</div><div className="mt-1 text-2xl font-bold">{lastAssessment || "—"}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Attendance</div><div className="mt-1 text-2xl font-bold">{attRate}%</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Years exp.</div><div className="mt-1 text-2xl font-bold">{athlete.years_experience ?? 0}</div></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Performance trend</h2>
          </div>
          <div className="h-56">
            {trendData.length > 1 ? (
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">Need at least 2 assessments to chart trend.</div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Award className="h-4 w-4" /> Promotion history</h2>
          <ul className="space-y-2 text-sm">
            {(promotions ?? []).length === 0 && <li className="text-muted-foreground">No promotions yet.</li>}
            {(promotions ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <div className="font-medium capitalize">{p.previous_level || "—"} → {p.new_level}</div>
                  <div className="text-xs text-muted-foreground">{p.promotion_date}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-success" />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Recent assessments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2">Date</th><th>Quarter</th><th>Overall</th><th>Comments</th></tr>
            </thead>
            <tbody className="divide-y">
              {(assessments ?? []).length === 0 && <tr><td colSpan={4} className="py-4 text-muted-foreground">No assessments yet.</td></tr>}
              {(assessments ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="py-2">{a.assessment_date}</td>
                  <td>{a.quarter || "—"}</td>
                  <td className="font-semibold">{a.overall_score}</td>
                  <td className="text-muted-foreground">{a.comments || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Profile</h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row k="Date of birth" v={athlete.date_of_birth} />
          <Row k="Gender" v={athlete.gender} />
          <Row k="Nationality" v={athlete.nationality} />
          <Row k="ID/Passport" v={athlete.id_passport} />
          <Row k="School" v={athlete.school} />
          <Row k="Class" v={athlete.class_level} />
          <Row k="Town" v={athlete.town} />
          <Row k="Address" v={athlete.address} />
          <Row k="Parent" v={athlete.parent_name} />
          <Row k="Parent phone" v={athlete.parent_phone} />
          <Row k="Emergency" v={`${athlete.emergency_contact_name ?? "—"} (${athlete.emergency_contact_phone ?? "—"})`} />
          <Row k="Preferred foot" v={athlete.preferred_foot} />
        </dl>
        {athlete.medical_info && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-warning-foreground">Medical</div>
            <p className="mt-1 text-sm">{athlete.medical_info}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between border-b py-1 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium text-right">{v || "—"}</dd>
    </div>
  );
}

function AssessDialog({ athleteId, userId, onDone }: { athleteId: string; userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [overall, setOverall] = useState(0);
  const [quarter, setQuarter] = useState("");
  const [comments, setComments] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const payload: any = {
        athlete_id: athleteId, assessor_id: userId,
        overall_score: overall, quarter: quarter || null, comments: comments || null,
        ...scores,
      };
      const { error } = await supabase.from("assessments").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assessment saved"); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary"><Award className="mr-2 h-4 w-4" />Assess</Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New assessment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Quarter (e.g. Q1 2026)</Label><Input value={quarter} onChange={(e) => setQuarter(e.target.value)} /></div>
            <div><Label>Overall (0–100) *</Label><Input type="number" min={0} max={100} value={overall} onChange={(e) => setOverall(Number(e.target.value))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {CATEGORIES.map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input type="number" min={0} max={100} value={scores[key] ?? ""} onChange={(e) => setScores({ ...scores, [key]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <div><Label>Comments</Label><Textarea value={comments} onChange={(e) => setComments(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => submit.mutate()} disabled={!overall || submit.isPending}>Save assessment</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromoteDialog({ athleteId, userId, currentLevel, onDone }: { athleteId: string; userId: string; currentLevel: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [newLevel, setNewLevel] = useState<typeof LEVELS[number] | "">("");
  const [reason, setReason] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!newLevel) throw new Error("Pick a level");
      const { error: e1 } = await supabase.from("promotions").insert({
        athlete_id: athleteId, promoted_by: userId,
        previous_level: currentLevel as any, new_level: newLevel as any, reason: reason || null,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("athletes").update({ current_level: newLevel as any }).eq("id", athleteId);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Athlete promoted"); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><ArrowUpRight className="mr-2 h-4 w-4" />Promote</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Promote athlete</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Current level: <span className="font-medium capitalize">{currentLevel}</span></div>
          <div>
            <Label>New level</Label>
            <Select value={newLevel} onValueChange={(v: any) => setNewLevel(v)}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => submit.mutate()} disabled={submit.isPending}>Confirm promotion</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ athleteId, currentBranchId, userId, onDone }: { athleteId: string; currentBranchId: string; userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [toBranch, setToBranch] = useState("");
  const [reason, setReason] = useState("");
  const { data: branches } = useQuery({
    queryKey: ["branches-min"],
    queryFn: async () => (await supabase.from("branches").select("id, code, name").order("name")).data ?? [],
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!toBranch) throw new Error("Pick a branch");
      const { error: e1 } = await supabase.from("athlete_transfers").insert({
        athlete_id: athleteId, from_branch_id: currentBranchId, to_branch_id: toBranch,
        reason: reason || null, performed_by: userId,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("athletes").update({ branch_id: toBranch }).eq("id", athleteId);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Athlete transferred"); setOpen(false); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Transfer</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Transfer athlete</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>To branch</Label>
            <Select value={toBranch} onValueChange={setToBranch}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {(branches ?? []).filter((b) => b.id !== currentBranchId).map((b) => <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={() => submit.mutate()} disabled={submit.isPending}>Transfer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
