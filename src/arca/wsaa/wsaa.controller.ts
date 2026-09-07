import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import type { AuthUser } from "../../common/auth/auth-user.type";
import { CurrentUser } from "../../common/auth/current-user.decorator";
import { SupabaseAuthGuard } from "../../common/auth/supabase-auth.guard";
import { AmbienteQueryDto } from "../dto/ambiente-query.dto";
import { WsaaService } from "./wsaa.service";
import { Throttle } from "@nestjs/throttler";

@Controller("arca/wsaa")
@UseGuards(SupabaseAuthGuard)
export class WsaaController {
  constructor(
    private readonly wsaa: WsaaService,
  ) {}

  @Throttle({
  default: {
    limit: 10,
    ttl: 60_000,
  },
})
  @Post(":comercioId/autenticar")
  authenticate(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
  ) {
    return this.wsaa.authenticate(
      user,
      comercioId,
      query.ambiente,
    );
  }
}