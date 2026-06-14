import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Building2, Users, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/branches/")({
  component: BranchesIndex,
});

function BranchesIndex() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { data: myBranches } = useQuery({
    queryKey: ["my-branches", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_coaches")
        .select("branches(id, code, name, location)")
        .eq("user_id", user!.id);
      return (data ?? []).map((r: any) => r.branches).filter(Boolean);
    },
  });

  const { data: allBranches } = useQuery({
    queryKey: ["all-branches-overview"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("branches")
        .select("id, code, name, location, active, athletes(count)")
        .order("name");
      return data ?? [];
    },
  });

  // Coach with exactly one branch: auto-redirect
  useEffect(() => {
    if (!isAdmin && myBranches && myBranches.length === 1) {
      navigate({ to: "/branches/$code", params: { code: myBranches[0].code }, replace: true });
    }
  }, [isAdmin, myBranches, navigate]);

  const list = isAdmin ? allBranches : myBranches;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
        <p className="text-muted-foreground">
          {isAdmin ? "Open any branch to see athletes, fees and performance." : "Your assigned branches."}
        </p>
      </div>

      {(!list || list.length === 0) && (
        <Card className="p-6 text-sm text-muted-foreground">
          {isAdmin ? "No branches yet." : "You haven't been assigned to a branch yet. Ask a super admin."}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(list ?? []).map((b: any) => (
          <Link key={b.id} to="/branches/$code" params={{ code: b.code }}>
            <Card className="p-5 hover:border-accent transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono font-semibold text-accent tracking-wider">{b.code}</div>
                  <div className="mt-1 text-lg font-semibold">{b.name}</div>
                  <div className="text-sm text-muted-foreground">{b.location || "—"}</div>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                {b.athletes ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                    <Users className="h-3 w-3" /> {b.athletes?.[0]?.count ?? 0} athletes
                  </span>
                ) : <span />}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
