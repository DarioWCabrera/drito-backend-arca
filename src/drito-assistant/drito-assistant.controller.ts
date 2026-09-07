import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser } from "../common/auth/auth-user.type";
import { SupabaseAuthGuard } from "../common/auth/supabase-auth.guard";
import { DritoAssistantService } from "./drito-assistant.service";
import { DritoAssistantMessageDto } from "./dto/drito-assistant-message.dto";
import { Throttle } from "@nestjs/throttler";

type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
};

@Controller("drito-assistant")
@UseGuards(SupabaseAuthGuard)
export class DritoAssistantController {
  constructor(
    private readonly assistant: DritoAssistantService,
  ) {}

  private obtenerUsuario(
    request: AuthenticatedRequest,
  ): AuthUser {
    if (!request.authUser) {
      throw new Error(
        "Usuario autenticado no disponible",
      );
    }

    return request.authUser;
  }

  private obtenerBearerToken(
    request: AuthenticatedRequest,
  ): string {
    const header =
      request.headers.authorization ?? "";

    const match =
      /^Bearer\s+(.+)$/i.exec(
        header,
      );

    if (!match) {
      throw new UnauthorizedException(
        "Falta Bearer token",
      );
    }

    return match[1].trim();
  }

  @Get(":comercioId/contexto")
  async contextoSeguro(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
  ) {
    return this.assistant.obtenerContextoSeguro(
      this.obtenerUsuario(request),
      comercioId,
    );
  }

  @Get(":comercioId/ventas/resumen-mes")
  async resumenVentasMes(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
  ) {
    return this.assistant.obtenerResumenVentasMes(
      this.obtenerUsuario(request),
      comercioId,
    );
  }

  @Get(":comercioId/cuentas-clientes/deudores")
  async clientesConDeuda(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
  ) {
    return this.assistant.obtenerClientesConDeuda(
      this.obtenerUsuario(request),
      comercioId,
    );
  }


  @Get(":comercioId/caja/resumen-mes")
  async resumenCajaMes(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
  ) {
    return this.assistant.obtenerResumenCajaMes(
      this.obtenerUsuario(request),
      comercioId,
    );
  }

  @Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
  @Post(
    ":comercioId/acciones/:accionId/confirmar-venta",
  )
  async confirmarVentaPreparada(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Param("accionId") accionId: string,
  ) {
    return this.assistant.confirmarVentaPreparada(
      this.obtenerUsuario(request),
      comercioId,
      accionId,
      this.obtenerBearerToken(request),
    );
  }

  @Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
  @Post(
    ":comercioId/acciones/:accionId/confirmar-compra",
  )
  async confirmarCompraPreparada(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Param("accionId") accionId: string,
  ) {
    return this.assistant.confirmarCompraPreparada(
      this.obtenerUsuario(request),
      comercioId,
      accionId,
      this.obtenerBearerToken(request),
    );
  }

  @Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
  @Post(
    ":comercioId/acciones/:accionId/confirmar-pago-proveedor",
  )
  async confirmarPagoProveedorPreparado(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Param("accionId") accionId: string,
  ) {
    return this.assistant.confirmarPagoProveedorPreparado(
      this.obtenerUsuario(request),
      comercioId,
      accionId,
      this.obtenerBearerToken(request),
    );
  }

  @Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
  @Post(
    ":comercioId/acciones/:accionId/confirmar-gasto",
  )
  async confirmarGastoPreparado(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Param("accionId") accionId: string,
  ) {
    return this.assistant.confirmarGastoPreparado(
      this.obtenerUsuario(request),
      comercioId,
      accionId,
      this.obtenerBearerToken(request),
    );
  }

  @Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
  @Post(
    ":comercioId/acciones/:accionId/confirmar-stock-ajuste",
  )
  async confirmarStockAjustePreparado(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Param("accionId") accionId: string,
  ) {
    return this.assistant.confirmarStockAjustePreparado(
      this.obtenerUsuario(request),
      comercioId,
      accionId,
      this.obtenerBearerToken(request),
    );
  }

  @Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
  @Post(
    ":comercioId/acciones/:accionId/confirmar-stock-salida",
  )
  async confirmarStockSalidaPreparada(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Param("accionId") accionId: string,
  ) {
    return this.assistant.confirmarStockSalidaPreparada(
      this.obtenerUsuario(request),
      comercioId,
      accionId,
      this.obtenerBearerToken(request),
    );
  }

  @Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
  @Post(
    ":comercioId/acciones/:accionId/confirmar-stock",
  )
  async confirmarStockPreparado(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Param("accionId") accionId: string,
  ) {
    return this.assistant.confirmarStockPreparado(
      this.obtenerUsuario(request),
      comercioId,
      accionId,
      this.obtenerBearerToken(request),
    );
  }

  @Throttle({
  default: {
    limit: 20,
    ttl: 60_000,
  },
})
  @Post(
    ":comercioId/acciones/:accionId/confirmar-cobro",
  )
  async confirmarCobroPreparado(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Param("accionId") accionId: string,
  ) {
    return this.assistant.confirmarCobroPreparado(
      this.obtenerUsuario(request),
      comercioId,
      accionId,
      this.obtenerBearerToken(request),
    );
  }

  @Throttle({
  default: {
    limit: 30,
    ttl: 60_000,
  },
})
  @Post(":comercioId/mensaje")
  async procesarMensaje(
    @Req() request: AuthenticatedRequest,
    @Param("comercioId") comercioId: string,
    @Body() body: DritoAssistantMessageDto,
  ) {
    return this.assistant.procesarMensaje(
      this.obtenerUsuario(request),
      comercioId,
      body,
    );
  }
}
