import {
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { SupabaseAdminService } from "../../infrastructure/supabase/supabase-admin.service";

type Membership = {
  id: string;
  rol: string;
  activo: boolean;
};

@Injectable()
export class PermissionsService {
  constructor(
    private readonly supabase:
      SupabaseAdminService,
  ) {}

  private async getMembership(
    userId: string,
    comercioId: string,
  ): Promise<Membership> {
    const { data, error } =
      await this.supabase.client
        .from("usuarios_comercios")
        .select("id, rol, activo")
        .eq("usuario_id", userId)
        .eq("comercio_id", comercioId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || !data.activo) {
      throw new ForbiddenException(
        "No pertenecés al comercio indicado",
      );
    }

    return data as Membership;
  }

  async hasPermission(
    userId: string,
    comercioId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const membership =
      await this.getMembership(
        userId,
        comercioId,
      );

    if (membership.rol === "admin") {
      return true;
    }

    const { data: override, error: overrideError } =
      await this.supabase.client
        .from("usuarios_permisos")
        .select("permitido")
        .eq(
          "usuario_comercio_id",
          membership.id,
        )
        .eq(
          "permiso_codigo",
          permissionCode,
        )
        .maybeSingle();

    if (overrideError) {
      throw overrideError;
    }

    if (override) {
      return Boolean(override.permitido);
    }

    const { data: rolePermission, error } =
      await this.supabase.client
        .from("roles_permisos")
        .select("permitido")
        .eq("rol", membership.rol)
        .eq("permiso_codigo", permissionCode)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(
      rolePermission?.permitido,
    );
  }

  async assertAny(
    userId: string,
    comercioId: string,
    permissions: string[],
  ): Promise<void> {
    for (const code of permissions) {
      if (
        await this.hasPermission(
          userId,
          comercioId,
          code,
        )
      ) {
        return;
      }
    }

    throw new ForbiddenException(
      "No tenés permiso para esta operación fiscal",
    );
  }
}
