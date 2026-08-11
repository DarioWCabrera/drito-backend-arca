import {
  Body,
  Controller,
  Get,
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
import { CondicionIvaQueryDto } from "../dto/condicion-iva-query.dto";
import { ConsultarComprobanteQueryDto } from "../dto/consultar-comprobante-query.dto";
import { PrepararCaeCDto } from "../dto/preparar-cae-c.dto";
import { EmitirCaeCIdempotenteDto } from "../dto/emitir-cae-c-idempotente.dto";
import { WsfeService } from "./wsfe.service";

@Controller("arca/wsfe")
@UseGuards(SupabaseAuthGuard)
export class WsfeController {
  constructor(
    private readonly wsfe: WsfeService,
  ) {}

  @Get(":comercioId/tipos-comprobante")
  getTiposComprobante(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
  ) {
    return this.wsfe.getTiposComprobante(
      user,
      comercioId,
      query.ambiente,
    );
  }


  @Get(":comercioId/condiciones-iva-receptor")
  getCondicionesIvaReceptor(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: CondicionIvaQueryDto,
  ) {
    return this.wsfe.getCondicionesIvaReceptor(
      user,
      comercioId,
      query.ambiente,
      query.clase,
    );
  }


  @Post(":comercioId/preparar-cae-c")
  prepararCaeC(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
    @Body() body: PrepararCaeCDto,
  ) {
    return this.wsfe.prepararCaeC(
      user,
      comercioId,
      query.ambiente,
      body,
    );
  }

  @Post(":comercioId/persistir-cae-c")
  persistirCaeC(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
    @Body() body: EmitirCaeCIdempotenteDto,
  ) {
    return this.wsfe.persistirCaeC(
      user,
      comercioId,
      query.ambiente,
      body,
    );
  }


  @Post(":comercioId/prevalidar-cae-c-idempotente")
  prevalidarCaeCIdempotente(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
    @Body() body: EmitirCaeCIdempotenteDto,
  ) {
    return this.wsfe.prevalidarCaeCIdempotente(
      user,
      comercioId,
      query.ambiente,
      body,
    );
  }


  @Post(":comercioId/emitir-cae-c-idempotente")
  emitirCaeCIdempotente(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
    @Body() body: EmitirCaeCIdempotenteDto,
  ) {
    return this.wsfe.emitirCaeCIdempotente(
      user,
      comercioId,
      query.ambiente,
      body,
    );
  }

  @Post(":comercioId/emitir-cae-c")
  emitirCaeC(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
    @Body() body: PrepararCaeCDto,
  ) {
    return this.wsfe.emitirCaeC(
      user,
      comercioId,
      query.ambiente,
      body,
    );
  }

  @Post(":comercioId/prevalidar-cae-c")
  prevalidarCaeC(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
    @Body() body: PrepararCaeCDto,
  ) {
    return this.wsfe.prevalidarCaeC(
      user,
      comercioId,
      query.ambiente,
      body,
    );
  }

  @Get(":comercioId/comprobantes-fiscales/:comprobanteFiscalId/representacion")
  getRepresentacionFiscal(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Param(
      "comprobanteFiscalId",
      new ParseUUIDPipe(),
    )
    comprobanteFiscalId: string,
  ) {
    return this.wsfe.getRepresentacionFiscal(
      user,
      comercioId,
      comprobanteFiscalId,
    );
  }

  @Get(":comercioId/comprobante")
  consultarComprobante(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: ConsultarComprobanteQueryDto,
  ) {
    return this.wsfe.consultarComprobante(
      user,
      comercioId,
      query.ambiente,
      query.puntoVenta,
      query.tipoComprobante,
      query.numeroComprobante,
    );
  }

  @Get(":comercioId/ultimo-autorizado")
  getUltimoAutorizado(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
    @Query("puntoVenta")
    puntoVentaText: string,
    @Query("tipoComprobante")
    tipoComprobanteText: string,
  ) {
    return this.wsfe.getUltimoAutorizado(
      user,
      comercioId,
      query.ambiente,
      Number(puntoVentaText),
      Number(tipoComprobanteText),
    );
  }

  @Get(":comercioId/puntos-venta")
  getPuntosVenta(
    @CurrentUser() user: AuthUser,
    @Param(
      "comercioId",
      new ParseUUIDPipe(),
    )
    comercioId: string,
    @Query() query: AmbienteQueryDto,
  ) {
    return this.wsfe.getPuntosVenta(
      user,
      comercioId,
      query.ambiente,
    );
  }
}
