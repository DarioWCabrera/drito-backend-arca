import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { SupabaseAuthGuard } from "../common/auth/supabase-auth.guard";
import { CurrentUser } from "../common/auth/current-user.decorator";
import type { AuthUser } from "../common/auth/auth-user.type";
import { ArcaCredentialsService } from "./arca-credentials.service";
import { UploadCredentialsDto } from "./dto/upload-credentials.dto";
import { AmbienteQueryDto } from "./dto/ambiente-query.dto";
import { Throttle } from "@nestjs/throttler";

type UploadedCredentialFiles = {
  certificado?: Express.Multer.File[];
  clavePrivada?: Express.Multer.File[];
};

@Controller("arca/credenciales")
@UseGuards(SupabaseAuthGuard)
export class ArcaCredentialsController {
  constructor(
    private readonly credentials:
      ArcaCredentialsService,
  ) {}

  @Get(":comercioId/status")
  getStatus(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
  ) {
    return this.credentials.getStatus(
      user,
      comercioId,
      query.ambiente,
    );
  }

  @Throttle({
  default: {
    limit: 5,
    ttl: 60_000,
  },
})
  @Post(":comercioId")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: "certificado",
          maxCount: 1,
        },
        {
          name: "clavePrivada",
          maxCount: 1,
        },
      ],
      {
        limits: {
          files: 2,
          fileSize: 1024 * 1024,
        },
      },
    ),
  )
  uploadCredentials(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Body() body: UploadCredentialsDto,
    @UploadedFiles()
    files: UploadedCredentialFiles,
  ) {
    const certificate =
      files.certificado?.[0];

    const privateKey =
      files.clavePrivada?.[0];

    if (!certificate || !privateKey) {
      throw new BadRequestException(
        "Debés enviar certificado y clavePrivada",
      );
    }

    return this.credentials.saveCredentials({
      user,
      comercioId,
      ambiente: body.ambiente,
      alias: body.alias,
      passphrase: body.passphrase,
      certificate:
        certificate.buffer,
      privateKey:
        privateKey.buffer,
    });
  }

  @Throttle({
  default: {
    limit: 10,
    ttl: 60_000,
  },
})
  @Post(":comercioId/validar")
  validateCredentials(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
  ) {
    return this.credentials
      .validateStoredCredentials(
        user,
        comercioId,
        query.ambiente,
      );
  }

  @Throttle({
  default: {
    limit: 5,
    ttl: 60_000,
  },
})
  @Delete(":comercioId")
  deleteCredentials(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
  ) {
    return this.credentials
      .deleteCredentials(
        user,
        comercioId,
        query.ambiente,
      );
  }
}
