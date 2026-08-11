import { Module } from "@nestjs/common";
import { ArcaCredentialsController } from "./arca-credentials.controller";
import { ArcaCredentialsService } from "./arca-credentials.service";
import { CredentialsVaultService } from "./crypto/credentials-vault.service";
import { SupabaseAdminService } from "../infrastructure/supabase/supabase-admin.service";
import { SupabaseAuthGuard } from "../common/auth/supabase-auth.guard";
import { PermissionsService } from "../common/security/permissions.service";
import { WsaaController } from "./wsaa/wsaa.controller";
import { WsaaService } from "./wsaa/wsaa.service";
import { WsfeController } from "./wsfe/wsfe.controller";
import { WsfeService } from "./wsfe/wsfe.service";

@Module({
  controllers: [
    ArcaCredentialsController,
    WsaaController,
    WsfeController,
  ],
  providers: [
    SupabaseAdminService,
    SupabaseAuthGuard,
    PermissionsService,
    CredentialsVaultService,
    ArcaCredentialsService,
    WsaaService,
    WsfeService,
  ],
  exports: [
    ArcaCredentialsService,
    WsaaService,
    WsfeService,
  ],
})
export class ArcaModule {}
