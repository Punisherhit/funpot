import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/assessments")({
  component: AssessmentsPage,
});

function AssessmentsPage() {
  const { data } = useQuery({
    queryKey: ["all-assessments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, assessment_date, overall_score, quarter, comments, athletes(id, full_name, athlete_number)")
        .order("assessment_date", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
        <p className="text-muted-foreground">Open an athlete to record a new assessment.</p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Athlete</th>
                <th className="px-4 py-3 text-left font-medium">Quarter</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data ?? []).length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No assessments yet.</td></tr>}
              {(data ?? []).map((a: any) => (
                <tr key={a.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">{a.assessment_date}</td>
                  <td className="px-4 py-3">
                    <Link to="/athletes/$id" params={{ id: a.athletes.id }} className="font-medium hover:text-primary">{a.athletes.full_name}</Link>
                    <div className="text-xs font-mono text-muted-foreground">{a.athletes.athlete_number}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.quarter || "—"}</td>
                  <td className="px-4 py-3 font-semibold">{a.overall_score}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{a.comments || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
