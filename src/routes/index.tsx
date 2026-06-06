import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Activity, Award, BarChart3, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Funpot Skating Club — Club Management" },
      { name: "description", content: "Digital management for Funpot Skating Club: athletes, attendance, assessments, competitions, and payments across Malindi, Watamu and Kilifi." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">F</div>
          <span className="font-bold tracking-tight">Funpot Skating Club</span>
        </div>
        <Link to="/auth"><Button>Sign in</Button></Link>
      </header>

      <main className="container mx-auto px-6 py-16 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Malindi · Watamu · Kilifi
          </div>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Run your club, <span className="text-primary">not paper forms.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Register athletes, track attendance, assess performance, rank skaters and manage payments —
            all in one place, on any device.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg">Get started</Button></Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Athletes", desc: "Auto-numbered profiles with photos, guardians, and medical info." },
            { icon: Activity, title: "Attendance", desc: "Mark sessions from your phone in seconds." },
            { icon: Award, title: "Assessments", desc: "Quarterly scoring across 14 categories." },
            { icon: BarChart3, title: "Rankings", desc: "70% assessment · 20% attendance · 10% competition." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
