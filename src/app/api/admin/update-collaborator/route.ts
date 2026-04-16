import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERMISSION_OPTIONS, type PermissionKey } from "@/lib/permissions";

const APP_ROLES = new Set(["owner", "admin", "cashier", "delivery"]);
const REQUIRED_PERMISSION: PermissionKey = "activities.view";

/**
 * Actualiza colaborador en auth (si cambia el correo) y en public.users con service role
 * para que correo, permisos y demás campos persistan igual que en la app.
 *
 * POST /api/admin/update-collaborator
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user: callerAuth },
    } = await supabase.auth.getUser();
    if (!callerAuth) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      target_user_id,
      name,
      email,
      role,
      status,
      avatar_url,
      permissions,
    } = body as {
      target_user_id?: string;
      name?: string;
      email?: string;
      role?: string;
      status?: string;
      avatar_url?: string;
      permissions?: unknown;
    };

    if (!target_user_id || typeof target_user_id !== "string") {
      return NextResponse.json({ error: "Falta el usuario a actualizar." }, { status: 400 });
    }

    const nameTrim = String(name ?? "").trim();
    if (!nameTrim) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }

    const emailNorm = String(email ?? "")
      .trim()
      .toLowerCase();
    if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
    }

    const roleVal = String(role ?? "cashier");
    if (!APP_ROLES.has(roleVal)) {
      return NextResponse.json({ error: "Rol no válido." }, { status: 400 });
    }

    const statusVal = status === "inactive" ? "inactive" : "active";

    const allowedPerm = new Set(PERMISSION_OPTIONS.map((p) => p.key));
    const rawPerms = Array.isArray(permissions) ? permissions : [];
    const permsFiltered = rawPerms.filter(
      (p): p is PermissionKey => typeof p === "string" && allowedPerm.has(p as PermissionKey)
    );
    const permissionsFinal = Array.from(new Set([...permsFiltered, REQUIRED_PERMISSION]));

    const avatarVal =
      typeof avatar_url === "string" && avatar_url.trim() !== "" ? avatar_url.trim() : "avatar:beam";

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Error de configuración del servidor." }, { status: 500 });
    }

    const { data: callerRow, error: callerErr } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", callerAuth.id)
      .single();
    if (callerErr || !callerRow?.organization_id) {
      return NextResponse.json({ error: "No se pudo verificar tu organización." }, { status: 403 });
    }

    const { data: targetRow, error: targetErr } = await supabase
      .from("users")
      .select("id, organization_id, email")
      .eq("id", target_user_id)
      .single();

    if (targetErr || !targetRow) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (targetRow.organization_id !== callerRow.organization_id) {
      return NextResponse.json({ error: "No puedes modificar usuarios de otra organización." }, { status: 403 });
    }

    const admin = createAdminClient();
    const previousEmail = String(targetRow.email ?? "").trim().toLowerCase();

    if (previousEmail !== emailNorm) {
      const { error: authErr } = await admin.auth.admin.updateUserById(target_user_id, {
        email: emailNorm,
        email_confirm: true,
      });

      if (authErr) {
        const msg = authErr.message ?? "";
        const duplicate =
          authErr.code === "email_exists" ||
          /already|registered|exists|duplicate|taken/i.test(msg);
        return NextResponse.json(
          {
            error: duplicate
              ? "Ese correo ya está registrado en el sistema."
              : msg || "No se pudo actualizar el correo de acceso.",
          },
          { status: duplicate ? 409 : 400 }
        );
      }
    }

    const updatedAt = new Date().toISOString();
    const { error: dbErr, data: updatedRows } = await admin
      .from("users")
      .update({
        name: nameTrim,
        email: emailNorm,
        role: roleVal,
        status: statusVal,
        avatar_url: avatarVal,
        permissions: permissionsFinal,
        updated_at: updatedAt,
      })
      .eq("id", target_user_id)
      .select("id");

    if (dbErr) {
      console.error("update-collaborator: users update", dbErr);
      if (previousEmail !== emailNorm) {
        await admin.auth.admin.updateUserById(target_user_id, {
          email: previousEmail,
          email_confirm: true,
        });
      }
      return NextResponse.json(
        { error: dbErr.message || "No se pudieron guardar los cambios." },
        { status: 500 }
      );
    }

    if (!updatedRows?.length) {
      if (previousEmail !== emailNorm) {
        await admin.auth.admin.updateUserById(target_user_id, {
          email: previousEmail,
          email_confirm: true,
        });
      }
      return NextResponse.json({ error: "No se pudo actualizar el registro." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("update-collaborator error:", err);
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
  }
}
