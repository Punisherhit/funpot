import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/athletes/new")({
  component: NewAthlete,
});

const DISCIPLINES = [
  { value: "speed", label: "Speed Skating" },
  { value: "artistic", label: "Artistic Skating" },
  { value: "recreational", label: "Recreational/Fitness" },
  { value: "inline_hockey", label: "Inline Hockey" },
  { value: "other", label: "Other" },
];

function NewAthlete() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: branches } = useQuery({
    queryKey: ["branches-min"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, code, name").order("name");
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", gender: "", nationality: "Kenyan",
    id_passport: "", school: "", class_level: "", address: "", town: "",
    branch_id: "", discipline: "recreational" as "speed" | "artistic" | "recreational" | "inline_hockey" | "other",
    preferred_foot: "", years_experience: 0,
    parent_name: "", parent_phone: "", parent_email: "",
    emergency_contact_name: "", emergency_contact_phone: "",
    medical_info: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.branch_id) throw new Error("Pick a branch");
      const { data: numData, error: numErr } = await supabase.rpc("next_athlete_number", { _branch_id: form.branch_id });
      if (numErr) throw numErr;
      const athlete_number = numData as string;
      const { data, error } = await supabase.from("athletes").insert({
        athlete_number,
        full_name: form.full_name,
        date_of_birth: form.date_of_birth || null,
        gender: (form.gender || null) as any,
        nationality: form.nationality || null,
        id_passport: form.id_passport || null,
        school: form.school || null,
        class_level: form.class_level || null,
        address: form.address || null,
        town: form.town || null,
        branch_id: form.branch_id,
        discipline: form.discipline,
        preferred_foot: form.preferred_foot || null,
        years_experience: Number(form.years_experience) || 0,
        parent_name: form.parent_name || null,
        parent_phone: form.parent_phone || null,
        parent_email: form.parent_email || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        medical_info: form.medical_info || null,
        created_by: user?.id,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast.success("Athlete registered");
      navigate({ to: "/athletes/$id", params: { id: d!.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Register athlete</h1>
        <p className="text-muted-foreground">Athlete number will be auto-generated based on branch and year.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Personal</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Full name *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Date of birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nationality</Label><Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div>
            <div><Label>ID / Passport</Label><Input value={form.id_passport} onChange={(e) => setForm({ ...form, id_passport: e.target.value })} /></div>
            <div><Label>School</Label><Input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} /></div>
            <div><Label>Class/Level</Label><Input value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} /></div>
            <div><Label>Town/Area</Label><Input value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Skating</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Branch *</Label>
              <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {(branches ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Discipline</Label>
              <Select value={form.discipline} onValueChange={(v: any) => setForm({ ...form, discipline: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DISCIPLINES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Preferred foot</Label><Input value={form.preferred_foot} onChange={(e) => setForm({ ...form, preferred_foot: e.target.value })} placeholder="Left/Right" /></div>
            <div><Label>Years of experience</Label><Input type="number" min={0} value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: Number(e.target.value) })} /></div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Guardian & emergency</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Parent/Guardian name</Label><Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></div>
            <div><Label>Parent phone</Label><Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="+2547…" /></div>
            <div><Label>Parent email</Label><Input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} /></div>
            <div><Label>Emergency contact name</Label><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
            <div><Label>Emergency contact phone</Label><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
          </div>
          <div><Label>Medical information (allergies, conditions)</Label><Textarea value={form.medical_info} onChange={(e) => setForm({ ...form, medical_info: e.target.value })} /></div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/athletes" })}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>Register athlete</Button>
        </div>
      </form>
    </div>
  );
}
