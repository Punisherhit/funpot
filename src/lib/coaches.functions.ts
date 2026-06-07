import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateInput = { email: string; password: string; fullName: string };

export const createCoachAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateInput) => {
    if (!input?.email || !input?.password || !input?.fullName) {
      throw new Error("email, password and fullName are required");
    }
    if (input.password.length < 8) throw new Error("Password must be at least 8 characters");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is super_admin
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden: super admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);

    return { id: created.user?.id, email: created.user?.email };
  });
