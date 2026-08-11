import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAdminService } from "../../infrastructure/supabase/supabase-admin.service";
import type { AuthUser } from "./auth-user.type";

type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
};

@Injectable()
export class SupabaseAuthGuard
  implements CanActivate
{
  constructor(
    private readonly supabase:
      SupabaseAdminService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const header =
      request.headers.authorization ?? "";

    const match =
      /^Bearer\s+(.+)$/i.exec(header);

    if (!match) {
      throw new UnauthorizedException(
        "Falta Bearer token",
      );
    }

    const token = match[1].trim();

    const {
      data: { user },
      error,
    } = await this.supabase.client.auth.getUser(
      token,
    );

    if (error || !user) {
      throw new UnauthorizedException(
        "Sesión inválida o vencida",
      );
    }

    request.authUser = {
      id: user.id,
      email: user.email ?? null,
    };

    return true;
  }
}
