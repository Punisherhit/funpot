import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SendInput = { branchId: string; trigger?: "manual" | "auto" };

/**
 * Send fee reminder emails to parents of athletes with outstanding balances in a branch.
 * Uses the project's queued transactional-email route. Requires email infra to be set up.
 */
export const sendBranchFeeReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendInput) => {
    if (!input?.branchId) throw new Error("branchId is required");
    return { branchId: input.branchId, trigger: input.trigger ?? "manual" };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Authorize: admin OR coach of this branch
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    let allowed = !!isAdmin;
    if (!allowed) {
      const { data: bc } = await supabase
        .from("branch_coaches")
        .select("user_id")
        .eq("user_id", userId)
        .eq("branch_id", data.branchId)
        .maybeSingle();
      allowed = !!bc;
    }
    if (!allowed) throw new Error("Forbidden");

    // Service-role client so we can insert reminder_logs as system and read freely
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Branch info
    const { data: branch } = await supabaseAdmin
      .from("branches")
      .select("id, name, code")
      .eq("id", data.branchId)
      .single();
    if (!branch) throw new Error("Branch not found");

    // Athletes in branch with outstanding invoices
    const { data: invoices, error: invErr } = await supabaseAdmin
      .from("fee_invoices")
      .select("id, athlete_id, kind, description, amount_due, amount_paid, due_date, status, athletes(full_name, parent_email, parent_name)")
      .eq("branch_id", data.branchId)
      .in("status", ["pending", "partial", "overdue"]);
    if (invErr) throw new Error(invErr.message);

    // Group by athlete
    type Group = {
      athleteId: string;
      athleteName: string;
      parentName: string | null;
      parentEmail: string | null;
      total: number;
      lines: { kind: string; description: string | null; due: number; paid: number; dueDate: string }[];
    };
    const groups = new Map<string, Group>();
    for (const inv of invoices ?? []) {
      const a: any = inv.athletes;
      const key = inv.athlete_id;
      const outstanding = Number(inv.amount_due) - Number(inv.amount_paid);
      if (outstanding <= 0) continue;
      if (!groups.has(key)) {
        groups.set(key, {
          athleteId: inv.athlete_id,
          athleteName: a?.full_name ?? "Athlete",
          parentName: a?.parent_name ?? null,
          parentEmail: a?.parent_email ?? null,
          total: 0,
          lines: [],
        });
      }
      const g = groups.get(key)!;
      g.total += outstanding;
      g.lines.push({
        kind: inv.kind,
        description: inv.description,
        due: Number(inv.amount_due),
        paid: Number(inv.amount_paid),
        dueDate: inv.due_date,
      });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const g of groups.values()) {
      if (!g.parentEmail) {
        await supabaseAdmin.from("reminder_logs").insert({
          branch_id: data.branchId,
          athlete_id: g.athleteId,
          parent_email: "(missing)",
          trigger: data.trigger,
          total_outstanding: g.total,
          status: "skipped",
          error: "Parent email not set",
          sent_by: userId,
        });
        skipped++;
        continue;
      }

      try {
        const origin = process.env.PUBLIC_APP_URL || "";
        const res = await fetch(`${origin}/lovable/email/transactional/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // service-role token allows the queue route to accept the send
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
          },
          body: JSON.stringify({
            templateName: "fee-reminder",
            recipientEmail: g.parentEmail,
            idempotencyKey: `fee-reminder-${g.athleteId}-${new Date().toISOString().slice(0, 10)}`,
            templateData: {
              parentName: g.parentName,
              athleteName: g.athleteName,
              branchName: branch.name,
              total: g.total,
              lines: g.lines,
            },
          }),
        });
        if (!res.ok) throw new Error(`Send route returned ${res.status}`);

        await supabaseAdmin.from("reminder_logs").insert({
          branch_id: data.branchId,
          athlete_id: g.athleteId,
          parent_email: g.parentEmail,
          trigger: data.trigger,
          total_outstanding: g.total,
          status: "sent",
          sent_by: userId,
        });
        // mark invoices
        await supabaseAdmin
          .from("fee_invoices")
          .update({ reminder_last_sent_at: new Date().toISOString() })
          .eq("athlete_id", g.athleteId)
          .in("status", ["pending", "partial", "overdue"]);
        sent++;
      } catch (e: any) {
        await supabaseAdmin.from("reminder_logs").insert({
          branch_id: data.branchId,
          athlete_id: g.athleteId,
          parent_email: g.parentEmail,
          trigger: data.trigger,
          total_outstanding: g.total,
          status: "failed",
          error: e?.message ?? "unknown",
          sent_by: userId,
        });
        failed++;
      }
    }

    return { sent, skipped, failed, totalParents: groups.size };
  });
