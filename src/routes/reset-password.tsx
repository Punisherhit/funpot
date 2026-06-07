import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Funpot Skating Club" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-bold text-lg">Set a new password</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {ready ? "Enter your new password below." : "Validating reset link…"}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} />
          </div>
          <div>
            <Label htmlFor="cp">Confirm password</Label>
            <Input id="cp" type="password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready} />
          </div>
          <Button type="submit" className="w-full" disabled={!ready || busy}>Update password</Button>
        </form>
      </Card>
    </div>
  );
}
