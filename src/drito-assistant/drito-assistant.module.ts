import { Module } from "@nestjs/common";
import { SupabaseAuthGuard } from "../common/auth/supabase-auth.guard";
import { SupabaseAdminService } from "../infrastructure/supabase/supabase-admin.service";
import { DritoAssistantController } from "./drito-assistant.controller";
import { DritoAssistantService } from "./drito-assistant.service";

@Module({
  controllers: [DritoAssistantController],
  providers: [
    SupabaseAdminService,
    SupabaseAuthGuard,
    DritoAssistantService,
  ],
})
export class DritoAssistantModule {}
