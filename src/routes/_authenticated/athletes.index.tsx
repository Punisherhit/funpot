import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/athletes/")({
  component: AthletesList,
});

function AthletesList() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["athletes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athletes")
        .select("id, athlete_number, full_name, current_level, discipline, active, branch_id, branches(name, code)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((a: any) =>
    !q || a.full_name.toLowerCase().includes(q.toLowerCase()) || a.athlete_number.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Athletes</h1>
          <p className="text-muted-foreground">{data?.length ?? 0} registered</p>
        </div>
        <Link to="/athletes/new"><Button><Plus className="mr-2 h-4 w-4" />Register athlete</Button></Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or athlete number…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Athlete #</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Branch</th>
                <th className="px-4 py-3 text-left font-medium">Discipline</th>
                <th className="px-4 py-3 text-left font-medium">Level</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No athletes yet. Register your first one.</td></tr>
              )}
              {filtered.map((a: any) => (
                <tr key={a.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-xs">{a.athlete_number}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link to="/athletes/$id" params={{ id: a.id }} className="hover:text-primary">{a.full_name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.branches?.name ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{a.discipline.replace("_", " ")}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium capitalize">{a.current_level}</span></td>
                  <td className="px-4 py-3">{a.active ? <span className="text-success">Active</span> : <span className="text-muted-foreground">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
