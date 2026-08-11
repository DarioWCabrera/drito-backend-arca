import { createHash } from "node:crypto";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { AuthUser } from "../../common/auth/auth-user.type";
import { PermissionsService } from "../../common/security/permissions.service";
import { SupabaseAdminService } from "../../infrastructure/supabase/supabase-admin.service";
import type { AmbienteArca } from "../types/arca.types";
import type { PrepararCaeCDto } from "../dto/preparar-cae-c.dto";
import type { EmitirCaeCIdempotenteDto } from "../dto/emitir-cae-c-idempotente.dto";
import { WsaaService } from "../wsaa/wsaa.service";
import type {
  WsfeCondicionIvaReceptor,
  WsfeCondicionesIvaReceptorResult,
  WsfeComprobanteConsultadoResult,
  WsfeEmisionCaeCResult,
  WsfeEvento,
  WsfePuntoVenta,
  WsfePreparacionCaeCResult,
  WsfePuntosVentaResult,
  WsfePersistenciaCaeCResult,
  WsfeEmisionCaeCIdempotenteResult,
  WsfePrevalidacionCaeCIdempotenteResult,
  WsfePrevalidacionCaeCResult,
  WsfeRepresentacionFiscalResult,
  WsfeTipoComprobante,
  WsfeTiposComprobanteResult,
  WsfeUltimoAutorizadoResult,
} from "./wsfe.types";

type WsfeError = {
  codigo: number;
  mensaje: string;
};

@Injectable()
export class WsfeService {
  constructor(
    private readonly wsaa: WsaaService,
    private readonly permissions: PermissionsService,
    private readonly supabase: SupabaseAdminService,
  ) { }

  private wsfeUrl(ambiente: AmbienteArca): string {
    return ambiente === "produccion"
      ? "https://servicios1.afip.gov.ar/wsfev1/service.asmx"
      : "https://wswhomo.afip.gov.ar/wsfev1/service.asmx";
  }

  private normalizeDigits(
    value: string | null | undefined,
  ): string {
    return (value ?? "").replace(/\D/g, "");
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private decodeXmlEntities(value: string): string {
    return value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  }

  private extractTag(
    xml: string,
    tag: string,
  ): string | null {
    const match = new RegExp(
      `<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`,
      "i",
    ).exec(xml);

    return match?.[1]?.trim() ?? null;
  }

  private extractBlocks(
    xml: string,
    tag: string,
  ): string[] {
    const regex = new RegExp(
      `<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`,
      "gi",
    );

    const blocks: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(xml)) !== null) {
      blocks.push(match[1]);
    }

    return blocks;
  }

  private parseCodeMessageBlocks(
    xml: string,
    containerTag: "Errors" | "Events",
    itemTag: "Err" | "Evt",
  ): Array<{ codigo: number; mensaje: string }> {
    const container = this.extractTag(
      xml,
      containerTag,
    );

    if (!container) {
      return [];
    }

    return this.extractBlocks(
      container,
      itemTag,
    )
      .map((block) => {
        const codeText = this.extractTag(
          block,
          "Code",
        );
        const messageText = this.extractTag(
          block,
          "Msg",
        );

        return {
          codigo: Number(codeText ?? NaN),
          mensaje: this.decodeXmlEntities(
            messageText ?? "",
          ),
        };
      })
      .filter(
        (item) =>
          Number.isFinite(item.codigo) ||
          item.mensaje.length > 0,
      );
  }

  private parseTiposComprobante(
    soapXml: string,
  ): {
    tipos: WsfeTipoComprobante[];
    errores: WsfeError[];
    eventos: WsfeEvento[];
  } {
    const fault = this.extractTag(
      soapXml,
      "faultstring",
    );

    if (fault) {
      throw new BadGatewayException(
        `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`,
      );
    }

    const result = this.extractTag(
      soapXml,
      "FEParamGetTiposCbteResult",
    );

    if (!result) {
      throw new BadGatewayException(
        "WSFEv1 respondió sin FEParamGetTiposCbteResult",
      );
    }

    const tipos = this.extractBlocks(
      result,
      "CbteTipo",
    )
      .map((block) => {
        const idText = this.extractTag(
          block,
          "Id",
        );
        const descripcion = this.extractTag(
          block,
          "Desc",
        );
        const fechaDesde = this.extractTag(
          block,
          "FchDesde",
        );
        const fechaHasta = this.extractTag(
          block,
          "FchHasta",
        );

        return {
          id: Number(idText ?? NaN),
          descripcion:
            this.decodeXmlEntities(
              descripcion ?? "",
            ),
          fechaDesde: fechaDesde || null,
          fechaHasta: fechaHasta || null,
        };
      })
      .filter(
        (item) =>
          Number.isFinite(item.id) &&
          item.descripcion.length > 0,
      );

    const errores = this.parseCodeMessageBlocks(
      result,
      "Errors",
      "Err",
    );

    const eventos = this.parseCodeMessageBlocks(
      result,
      "Events",
      "Evt",
    );

    return {
      tipos,
      errores,
      eventos,
    };
  }

  private parsePuntosVenta(
    soapXml: string,
  ): {
    puntosVenta: WsfePuntoVenta[];
    errores: WsfeError[];
    eventos: WsfeEvento[];
  } {
    const fault = this.extractTag(
      soapXml,
      "faultstring",
    );

    if (fault) {
      throw new BadGatewayException(
        `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`,
      );
    }

    const result = this.extractTag(
      soapXml,
      "FEParamGetPtosVentaResult",
    );

    if (!result) {
      throw new BadGatewayException(
        "WSFEv1 respondió sin FEParamGetPtosVentaResult",
      );
    }

    const puntosVenta = this.extractBlocks(
      result,
      "PtoVenta",
    )
      .map((block) => {
        const numeroText = this.extractTag(
          block,
          "Nro",
        );
        const emisionTipo = this.extractTag(
          block,
          "EmisionTipo",
        );
        const bloqueado = this.extractTag(
          block,
          "Bloqueado",
        );
        const fechaBaja = this.extractTag(
          block,
          "FchBaja",
        );

        return {
          numero: Number(numeroText ?? NaN),
          emisionTipo:
            this.decodeXmlEntities(
              emisionTipo ?? "",
            ),
          bloqueado:
            this.decodeXmlEntities(
              bloqueado ?? "",
            ),
          fechaBaja: fechaBaja || null,
        };
      })
      .filter((item) =>
        Number.isFinite(item.numero),
      );

    const errores = this.parseCodeMessageBlocks(
      result,
      "Errors",
      "Err",
    );

    const eventos = this.parseCodeMessageBlocks(
      result,
      "Events",
      "Evt",
    );

    return {
      puntosVenta,
      errores,
      eventos,
    };
  }

  private parseCondicionesIvaReceptor(
    soapXml: string,
  ): {
    condiciones: WsfeCondicionIvaReceptor[];
    errores: WsfeError[];
    eventos: WsfeEvento[];
  } {
    const fault = this.extractTag(
      soapXml,
      "faultstring",
    );

    if (fault) {
      throw new BadGatewayException(
        `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`,
      );
    }

    const result = this.extractTag(
      soapXml,
      "FEParamGetCondicionIvaReceptorResult",
    );

    if (!result) {
      throw new BadGatewayException(
        "WSFEv1 respondió sin FEParamGetCondicionIvaReceptorResult",
      );
    }

    const resultGet = this.extractTag(
      result,
      "ResultGet",
    );

    const condiciones = resultGet
      ? this.extractBlocks(
        resultGet,
        "CondicionIvaReceptor",
      )
        .map((block) => {
          const idText = this.extractTag(
            block,
            "Id",
          );
          const descripcion = this.extractTag(
            block,
            "Desc",
          );
          const clase = this.extractTag(
            block,
            "Cmp_Clase",
          );

          return {
            id: Number(idText ?? NaN),
            descripcion:
              this.decodeXmlEntities(
                descripcion ?? "",
              ),
            claseComprobante:
              this.decodeXmlEntities(
                clase ?? "",
              ),
          };
        })
        .filter(
          (item) =>
            Number.isFinite(item.id) &&
            item.descripcion.length > 0 &&
            item.claseComprobante.length > 0,
        )
      : [];

    const errores = this.parseCodeMessageBlocks(
      result,
      "Errors",
      "Err",
    );

    const eventos = this.parseCodeMessageBlocks(
      result,
      "Events",
      "Evt",
    );

    return {
      condiciones,
      errores,
      eventos,
    };
  }

  private parseComprobanteConsultado(
    soapXml: string,
  ): {
    result: {
      puntoVenta: number;
      tipoComprobante: number;
      numeroComprobante: number;
      resultado: string;
      codigoAutorizacion: string;
      emisionTipo: string;
      fechaVencimiento: string;
      fechaProceso: string;
      concepto: number;
      docTipo: number;
      docNro: string;
      fechaComprobante: string;
      impTotal: number;
      impTotConc: number;
      impNeto: number;
      impOpEx: number;
      impTrib: number;
      impIVA: number;
      monId: string;
      monCotiz: number;
      condicionIvaReceptorId: number | null;
      observaciones: Array<{ codigo: number; mensaje: string }>;
    } | null;
    errores: WsfeError[];
    eventos: WsfeEvento[];
  } {
    const fault = this.extractTag(soapXml, "faultstring");

    if (fault) {
      throw new BadGatewayException(
        `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`,
      );
    }

    const container = this.extractTag(
      soapXml,
      "FECompConsultarResult",
    );

    if (!container) {
      throw new BadGatewayException(
        "WSFEv1 respondió sin FECompConsultarResult",
      );
    }

    const errores = this.parseCodeMessageBlocks(
      container,
      "Errors",
      "Err",
    );
    const eventos = this.parseCodeMessageBlocks(
      container,
      "Events",
      "Evt",
    );
    const resultGet = this.extractTag(container, "ResultGet");

    if (!resultGet) {
      return { result: null, errores, eventos };
    }

    const observacionesContainer = this.extractTag(
      resultGet,
      "Observaciones",
    );
    const observaciones = observacionesContainer
      ? this.extractBlocks(observacionesContainer, "Obs")
        .map((block) => ({
          codigo: Number(this.extractTag(block, "Code") ?? NaN),
          mensaje: this.decodeXmlEntities(
            this.extractTag(block, "Msg") ?? "",
          ),
        }))
        .filter(
          (item) =>
            Number.isFinite(item.codigo) ||
            item.mensaje.length > 0,
        )
      : [];

    const condicionText = this.extractTag(
      resultGet,
      "CondicionIVAReceptorId",
    );
    const condicion = condicionText
      ? Number(condicionText)
      : null;

    return {
      result: {
        puntoVenta: Number(this.extractTag(resultGet, "PtoVta") ?? NaN),
        tipoComprobante: Number(this.extractTag(resultGet, "CbteTipo") ?? NaN),
        numeroComprobante: Number(this.extractTag(resultGet, "CbteDesde") ?? NaN),
        resultado: this.decodeXmlEntities(
          this.extractTag(resultGet, "Resultado") ?? "",
        ),
        codigoAutorizacion: this.decodeXmlEntities(
          this.extractTag(resultGet, "CodAutorizacion") ?? "",
        ),
        emisionTipo: this.decodeXmlEntities(
          this.extractTag(resultGet, "EmisionTipo") ?? "",
        ),
        fechaVencimiento: this.extractTag(resultGet, "FchVto") ?? "",
        fechaProceso: this.extractTag(resultGet, "FchProceso") ?? "",
        concepto: Number(this.extractTag(resultGet, "Concepto") ?? NaN),
        docTipo: Number(this.extractTag(resultGet, "DocTipo") ?? NaN),
        docNro: this.extractTag(resultGet, "DocNro") ?? "",
        fechaComprobante: this.extractTag(resultGet, "CbteFch") ?? "",
        impTotal: Number(this.extractTag(resultGet, "ImpTotal") ?? NaN),
        impTotConc: Number(this.extractTag(resultGet, "ImpTotConc") ?? NaN),
        impNeto: Number(this.extractTag(resultGet, "ImpNeto") ?? NaN),
        impOpEx: Number(this.extractTag(resultGet, "ImpOpEx") ?? NaN),
        impTrib: Number(this.extractTag(resultGet, "ImpTrib") ?? NaN),
        impIVA: Number(this.extractTag(resultGet, "ImpIVA") ?? NaN),
        monId: this.decodeXmlEntities(
          this.extractTag(resultGet, "MonId") ?? "",
        ),
        monCotiz: Number(this.extractTag(resultGet, "MonCotiz") ?? NaN),
        condicionIvaReceptorId:
          condicion !== null && Number.isFinite(condicion)
            ? condicion
            : null,
        observaciones,
      },
      errores,
      eventos,
    };
  }

  private parseCaeSolicitar(
    soapXml: string,
  ): {
    cabecera: {
      puntoVenta: number;
      tipoComprobante: number;
      fechaProceso: string;
      cantidadRegistros: number;
      resultado: string;
      reproceso: string;
    } | null;
    detalle: {
      concepto: number;
      docTipo: number;
      docNro: string;
      cbteDesde: number;
      cbteHasta: number;
      cbteFch: string;
      resultado: string;
      cae: string;
      caeFchVto: string;
      observaciones: Array<{ codigo: number; mensaje: string }>;
    } | null;
    errores: WsfeError[];
    eventos: WsfeEvento[];
  } {
    const fault = this.extractTag(soapXml, "faultstring");

    if (fault) {
      throw new BadGatewayException(
        `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`,
      );
    }

    const result = this.extractTag(
      soapXml,
      "FECAESolicitarResult",
    );

    if (!result) {
      throw new BadGatewayException(
        "WSFEv1 respondió sin FECAESolicitarResult",
      );
    }

    const errores = this.parseCodeMessageBlocks(
      result,
      "Errors",
      "Err",
    );
    const eventos = this.parseCodeMessageBlocks(
      result,
      "Events",
      "Evt",
    );

    const cabeceraXml = this.extractTag(result, "FeCabResp");
    const detalleContainer = this.extractTag(result, "FeDetResp");
    const detalleXml = detalleContainer
      ? this.extractTag(detalleContainer, "FECAEDetResponse") ??
      this.extractTag(detalleContainer, "FEDetResponse")
      : null;

    const cabecera = cabeceraXml
      ? {
        puntoVenta: Number(this.extractTag(cabeceraXml, "PtoVta") ?? NaN),
        tipoComprobante: Number(
          this.extractTag(cabeceraXml, "CbteTipo") ?? NaN,
        ),
        fechaProceso: this.extractTag(cabeceraXml, "FchProceso") ?? "",
        cantidadRegistros: Number(
          this.extractTag(cabeceraXml, "CantReg") ?? NaN,
        ),
        resultado: this.decodeXmlEntities(
          this.extractTag(cabeceraXml, "Resultado") ?? "",
        ),
        reproceso: this.decodeXmlEntities(
          this.extractTag(cabeceraXml, "Reproceso") ?? "",
        ),
      }
      : null;

    let detalle: {
      concepto: number;
      docTipo: number;
      docNro: string;
      cbteDesde: number;
      cbteHasta: number;
      cbteFch: string;
      resultado: string;
      cae: string;
      caeFchVto: string;
      observaciones: Array<{ codigo: number; mensaje: string }>;
    } | null = null;

    if (detalleXml) {
      const observacionesContainer =
        this.extractTag(detalleXml, "Observaciones") ??
        this.extractTag(detalleXml, "Obs");
      const observaciones = observacionesContainer
        ? this.extractBlocks(observacionesContainer, "Obs")
          .concat(this.extractBlocks(observacionesContainer, "Observacion"))
          .map((block) => ({
            codigo: Number(this.extractTag(block, "Code") ?? NaN),
            mensaje: this.decodeXmlEntities(
              this.extractTag(block, "Msg") ?? "",
            ),
          }))
          .filter(
            (item) =>
              Number.isFinite(item.codigo) ||
              item.mensaje.length > 0,
          )
        : this.extractBlocks(detalleXml, "Obs")
          .map((block) => ({
            codigo: Number(this.extractTag(block, "Code") ?? NaN),
            mensaje: this.decodeXmlEntities(
              this.extractTag(block, "Msg") ?? "",
            ),
          }))
          .filter(
            (item) =>
              Number.isFinite(item.codigo) ||
              item.mensaje.length > 0,
          );

      detalle = {
        concepto: Number(this.extractTag(detalleXml, "Concepto") ?? NaN),
        docTipo: Number(this.extractTag(detalleXml, "DocTipo") ?? NaN),
        docNro: this.extractTag(detalleXml, "DocNro") ?? "",
        cbteDesde: Number(this.extractTag(detalleXml, "CbteDesde") ?? NaN),
        cbteHasta: Number(this.extractTag(detalleXml, "CbteHasta") ?? NaN),
        cbteFch: this.extractTag(detalleXml, "CbteFch") ?? "",
        resultado: this.decodeXmlEntities(
          this.extractTag(detalleXml, "Resultado") ?? "",
        ),
        cae: this.extractTag(detalleXml, "CAE") ?? "",
        caeFchVto: this.extractTag(detalleXml, "CAEFchVto") ?? "",
        observaciones,
      };
    }

    return {
      cabecera,
      detalle,
      errores,
      eventos,
    };
  }

  private parseUltimoAutorizado(
    soapXml: string,
  ): {
    puntoVenta: number;
    tipoComprobante: number;
    ultimoComprobante: number;
    errores: WsfeError[];
    eventos: WsfeEvento[];
  } {
    const fault = this.extractTag(
      soapXml,
      "faultstring",
    );

    if (fault) {
      throw new BadGatewayException(
        `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`,
      );
    }

    const result = this.extractTag(
      soapXml,
      "FECompUltimoAutorizadoResult",
    );

    if (!result) {
      throw new BadGatewayException(
        "WSFEv1 respondió sin FECompUltimoAutorizadoResult",
      );
    }

    const puntoVenta = Number(
      this.extractTag(result, "PtoVta") ?? NaN,
    );
    const tipoComprobante = Number(
      this.extractTag(result, "CbteTipo") ?? NaN,
    );
    const ultimoComprobante = Number(
      this.extractTag(result, "CbteNro") ?? NaN,
    );

    const errores = this.parseCodeMessageBlocks(
      result,
      "Errors",
      "Err",
    );

    const eventos = this.parseCodeMessageBlocks(
      result,
      "Events",
      "Evt",
    );

    return {
      puntoVenta,
      tipoComprobante,
      ultimoComprobante,
      errores,
      eventos,
    };
  }

  private async getCommerceCuit(
    comercioId: string,
  ): Promise<string> {
    const { data, error } =
      await this.supabase.client
        .from("comercios")
        .select("cuit")
        .eq("id", comercioId)
        .single();

    if (error) {
      throw error;
    }

    const cuit = this.normalizeDigits(
      data?.cuit,
    );

    if (cuit.length !== 11) {
      throw new BadRequestException(
        "El comercio debe tener un CUIT válido de 11 dígitos antes de consultar WSFEv1",
      );
    }

    return cuit;
  }

  private async getCommerceFiscalSnapshot(
    comercioId: string,
  ): Promise<{
    cuit: string;
    razonSocial: string | null;
    nombreComercial: string | null;
    condicionIva: string | null;
    ingresosBrutos: string | null;
    inicioActividades: string | null;
    domicilioFiscal: string | null;
  }> {
    // La identidad legal/comercial vive en `comercios`.
    // La configuración fiscal variable de cada empresa vive en
    // `configuraciones_fiscales_comercio`. No usamos los campos fiscales
    // temporales que puedan existir en `comercios`, para mantener una sola
    // fuente de verdad por comercio.
    const { data: comercio, error: comercioError } = await this.supabase.client
      .from("comercios")
      .select("cuit,razon_social,nombre_comercial")
      .eq("id", comercioId)
      .single();

    if (comercioError) {
      throw comercioError;
    }

    const { data: fiscal, error: fiscalError } = await this.supabase.client
      .from("configuraciones_fiscales_comercio")
      .select(
        "condicion_iva,ingresos_brutos,inicio_actividades,domicilio_fiscal,localidad_fiscal,provincia_fiscal,codigo_postal_fiscal",
      )
      .eq("comercio_id", comercioId)
      .maybeSingle();

    if (fiscalError) {
      throw fiscalError;
    }

    const cuit = this.normalizeDigits(comercio?.cuit);

    if (cuit.length !== 11) {
      throw new BadRequestException(
        "El comercio debe tener un CUIT válido de 11 dígitos.",
      );
    }

    const condicionIvaRaw = String(
      fiscal?.condicion_iva ?? "",
    )
      .trim()
      .toLowerCase();

    const etiquetasCondicionIva: Record<string, string> = {
      responsable_inscripto: "Responsable Inscripto",
      monotributista: "Monotributista",
      exento: "Exento",
      no_responsable: "No Responsable",
    };

    const condicionIvaConfigurada =
      etiquetasCondicionIva[condicionIvaRaw] ??
      String(fiscal?.condicion_iva ?? "").trim();

    const condicionIva =
      !condicionIvaRaw || condicionIvaRaw === "no_configurada"
        ? null
        : condicionIvaConfigurada || null;

    const partesDomicilioFiscal = [
      fiscal?.domicilio_fiscal,
      fiscal?.localidad_fiscal,
      fiscal?.provincia_fiscal,
      fiscal?.codigo_postal_fiscal
        ? `CP ${fiscal.codigo_postal_fiscal}`
        : null,
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    );

    return {
      cuit,
      razonSocial: comercio?.razon_social ?? null,
      nombreComercial: comercio?.nombre_comercial ?? null,
      condicionIva,
      ingresosBrutos: fiscal?.ingresos_brutos ?? null,
      inicioActividades: fiscal?.inicio_actividades ?? null,
      domicilioFiscal:
        partesDomicilioFiscal.length > 0
          ? partesDomicilioFiscal.join(", ")
          : null,
    };
  }

  private async getClienteFiscalSnapshot(
    comercioId: string,
    clienteId: string | null | undefined,
  ): Promise<{
    nombre: string | null;
    domicilio: string | null;
    email: string | null;
  } | null> {
    if (!clienteId) {
      return null;
    }

    const { data, error } = await this.supabase.client
      .from("clientes")
      .select(
        "id,comercio_id,nombre,razon_social,email,direccion,localidad,provincia,codigo_postal",
      )
      .eq("id", clienteId)
      .eq("comercio_id", comercioId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new BadRequestException(
        "El cliente indicado no existe dentro de este comercio.",
      );
    }

    const razonSocial =
      typeof data.razon_social === "string"
        ? data.razon_social.trim()
        : "";

    const nombre =
      typeof data.nombre === "string"
        ? data.nombre.trim()
        : "";

    const nombreReceptor =
      razonSocial ||
      nombre ||
      null;

    const partesDomicilio = [
      data.direccion,
      data.localidad,
      data.provincia,
      data.codigo_postal
        ? `CP ${data.codigo_postal}`
        : null,
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    );

    return {
      nombre: nombreReceptor,
      domicilio:
        partesDomicilio.length > 0
          ? partesDomicilio.join(", ")
          : null,
      email:
        typeof data.email === "string" &&
          data.email.trim().length > 0
          ? data.email.trim()
          : null,
    };
  }


  private async getVentaItemsFiscalSnapshot(
    comercioId: string,
    ventaId: string,
  ): Promise<any[]> {
    const { data, error } = await this.supabase.client
      .from("items_venta")
      .select(
        "producto_id,tipo,codigo,nombre,descripcion,unidad_medida,cantidad,precio_unitario,descuento_porcentaje,subtotal,descuento_importe,neto,iva_porcentaje,impuesto_importe,total,orden",
      )
      .eq("venta_id", ventaId)
      .eq("comercio_id", comercioId)
      .order("orden", { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new BadRequestException(
        "La venta indicada no tiene items para generar el snapshot fiscal.",
      );
    }

    return data.map((item: any, index: number) => {
      const nombre = String(item.nombre ?? "").trim();

      if (!nombre) {
        throw new BadRequestException(
          "La venta contiene un item sin nombre y no puede congelarse como detalle fiscal.",
        );
      }

      return {
        producto_id: item.producto_id ?? null,
        tipo: String(item.tipo ?? "producto").trim() || "producto",
        codigo: item.codigo ?? null,
        nombre,
        descripcion: item.descripcion ?? null,
        unidad_medida:
          String(item.unidad_medida ?? "unidad").trim() || "unidad",
        cantidad: item.cantidad ?? 0,
        precio_unitario: item.precio_unitario ?? 0,
        descuento_porcentaje: item.descuento_porcentaje ?? 0,
        subtotal: item.subtotal ?? 0,
        descuento_importe: item.descuento_importe ?? 0,
        clasificacion_fiscal: "gravado",
        iva_porcentaje: item.iva_porcentaje ?? null,
        neto: item.neto ?? item.total ?? 0,
        iva_importe: item.impuesto_importe ?? 0,
        total: item.total ?? 0,
        orden: item.orden ?? index,
      };
    });
  }

  async getTiposComprobante(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
  ): Promise<WsfeTiposComprobanteResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.consultar_arca",
        "facturacion.emitir",
        "facturacion.configurar",
        "facturacion.configurar_arca",
      ],
    );

    const cuit = await this.getCommerceCuit(
      comercioId,
    );

    const { ticket, fromCache } =
      await this.wsaa.getTicketForBackend(
        comercioId,
        ambiente,
        "wsfe",
      );

    const token = this.escapeXml(
      ticket.token,
    );
    const sign = this.escapeXml(
      ticket.sign,
    );

    const soap = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "<soap:Body>",
      '<FEParamGetTiposCbte xmlns="http://ar.gov.afip.dif.FEV1/">',
      "<Auth>",
      `<Token>${token}</Token>`,
      `<Sign>${sign}</Sign>`,
      `<Cuit>${cuit}</Cuit>`,
      "</Auth>",
      "</FEParamGetTiposCbte>",
      "</soap:Body>",
      "</soap:Envelope>",
    ].join("");

    const response = await fetch(
      this.wsfeUrl(ambiente),
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/xml; charset=utf-8",
          SOAPAction:
            "http://ar.gov.afip.dif.FEV1/FEParamGetTiposCbte",
        },
        body: soap,
        signal: AbortSignal.timeout(
          20_000,
        ),
      },
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      const fault = this.extractTag(
        responseText,
        "faultstring",
      );

      throw new BadGatewayException(
        fault
          ? `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`
          : `WSFEv1 respondió HTTP ${response.status}`,
      );
    }

    const parsed =
      this.parseTiposComprobante(
        responseText,
      );

    if (parsed.errores.length > 0) {
      const first = parsed.errores[0];

      throw new BadGatewayException(
        `WSFEv1 devolvió error ${first.codigo}: ${first.mensaje}`,
      );
    }

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "FEParamGetTiposCbte",
      ticketOrigen:
        fromCache ? "cache" : "wsaa",
      cantidad: parsed.tipos.length,
      tipos: parsed.tipos,
      eventos: parsed.eventos,
    };
  }

  async getPuntosVenta(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
  ): Promise<WsfePuntosVentaResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.consultar_arca",
        "facturacion.emitir",
        "facturacion.configurar",
        "facturacion.configurar_arca",
      ],
    );

    const cuit = await this.getCommerceCuit(
      comercioId,
    );

    const { ticket, fromCache } =
      await this.wsaa.getTicketForBackend(
        comercioId,
        ambiente,
        "wsfe",
      );

    const token = this.escapeXml(
      ticket.token,
    );
    const sign = this.escapeXml(
      ticket.sign,
    );

    const soap = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "<soap:Body>",
      '<FEParamGetPtosVenta xmlns="http://ar.gov.afip.dif.FEV1/">',
      "<Auth>",
      `<Token>${token}</Token>`,
      `<Sign>${sign}</Sign>`,
      `<Cuit>${cuit}</Cuit>`,
      "</Auth>",
      "</FEParamGetPtosVenta>",
      "</soap:Body>",
      "</soap:Envelope>",
    ].join("");

    const response = await fetch(
      this.wsfeUrl(ambiente),
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/xml; charset=utf-8",
          SOAPAction:
            "http://ar.gov.afip.dif.FEV1/FEParamGetPtosVenta",
        },
        body: soap,
        signal: AbortSignal.timeout(
          20_000,
        ),
      },
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      const fault = this.extractTag(
        responseText,
        "faultstring",
      );

      throw new BadGatewayException(
        fault
          ? `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`
          : `WSFEv1 respondió HTTP ${response.status}`,
      );
    }

    const parsed =
      this.parsePuntosVenta(
        responseText,
      );

    const sinResultados =
      parsed.puntosVenta.length === 0 &&
      parsed.errores.length > 0 &&
      parsed.errores.every(
        (error) => error.codigo === 602,
      );

    if (
      parsed.errores.length > 0 &&
      !sinResultados
    ) {
      const first = parsed.errores[0];

      throw new BadGatewayException(
        `WSFEv1 devolvió error ${first.codigo}: ${first.mensaje}`,
      );
    }

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "FEParamGetPtosVenta",
      ticketOrigen:
        fromCache ? "cache" : "wsaa",
      cantidad: parsed.puntosVenta.length,
      puntosVenta: parsed.puntosVenta,
      mensaje: sinResultados
        ? "ARCA no registra puntos de venta disponibles para este CUIT en el ambiente consultado."
        : null,
      eventos: parsed.eventos,
    };
  }

  async getCondicionesIvaReceptor(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    claseComprobanteRaw?: string,
  ): Promise<WsfeCondicionesIvaReceptorResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.consultar_arca",
        "facturacion.emitir",
        "facturacion.configurar",
        "facturacion.configurar_arca",
      ],
    );

    const claseComprobante =
      (claseComprobanteRaw ?? "")
        .trim()
        .toUpperCase();

    if (
      claseComprobante &&
      !/^[A-Z0-9]{1,5}$/.test(
        claseComprobante,
      )
    ) {
      throw new BadRequestException(
        "clase debe ser una clase de comprobante válida, por ejemplo C, B, A o ALEY",
      );
    }

    const cuit = await this.getCommerceCuit(
      comercioId,
    );

    const { ticket, fromCache } =
      await this.wsaa.getTicketForBackend(
        comercioId,
        ambiente,
        "wsfe",
      );

    const token = this.escapeXml(
      ticket.token,
    );
    const sign = this.escapeXml(
      ticket.sign,
    );

    const claseXml = claseComprobante
      ? `<ClaseCmp>${this.escapeXml(claseComprobante)}</ClaseCmp>`
      : "";

    const soap = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "<soap:Body>",
      '<FEParamGetCondicionIvaReceptor xmlns="http://ar.gov.afip.dif.FEV1/">',
      "<Auth>",
      `<Token>${token}</Token>`,
      `<Sign>${sign}</Sign>`,
      `<Cuit>${cuit}</Cuit>`,
      "</Auth>",
      claseXml,
      "</FEParamGetCondicionIvaReceptor>",
      "</soap:Body>",
      "</soap:Envelope>",
    ].join("");

    const response = await fetch(
      this.wsfeUrl(ambiente),
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/xml; charset=utf-8",
          SOAPAction:
            "http://ar.gov.afip.dif.FEV1/FEParamGetCondicionIvaReceptor",
        },
        body: soap,
        signal: AbortSignal.timeout(
          20_000,
        ),
      },
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      const fault = this.extractTag(
        responseText,
        "faultstring",
      );

      throw new BadGatewayException(
        fault
          ? `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`
          : `WSFEv1 respondió HTTP ${response.status}`,
      );
    }

    const parsed =
      this.parseCondicionesIvaReceptor(
        responseText,
      );

    if (parsed.errores.length > 0) {
      const first = parsed.errores[0];

      throw new BadGatewayException(
        `WSFEv1 devolvió error ${first.codigo}: ${first.mensaje}`,
      );
    }

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion:
        "FEParamGetCondicionIvaReceptor",
      ticketOrigen:
        fromCache ? "cache" : "wsaa",
      claseComprobante:
        claseComprobante || null,
      cantidad: parsed.condiciones.length,
      condiciones: parsed.condiciones,
      eventos: parsed.eventos,
    };
  }


  private isValidArcaDate(value: string): boolean {
    if (!/^\d{8}$/.test(value)) {
      return false;
    }

    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6));
    const day = Number(value.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  async prepararCaeC(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    body: PrepararCaeCDto,
  ): Promise<WsfePreparacionCaeCResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.preparar",
        "facturacion.emitir",
      ],
    );

    // Verifica que el comercio exista y tenga CUIT válido, pero NO llama a ARCA.
    await this.getCommerceCuit(comercioId);

    const comprobantesClaseC = new Set([11, 12, 13, 15]);
    if (!comprobantesClaseC.has(body.tipoComprobante)) {
      throw new BadRequestException(
        "Este preparador inicial admite comprobantes clase C: 11, 12, 13 o 15",
      );
    }

    const fechas = [
      body.fechaComprobante,
      body.fechaServicioDesde,
      body.fechaServicioHasta,
      body.fechaVencimientoPago,
    ].filter((value): value is string => Boolean(value));

    if (fechas.some((value) => !this.isValidArcaDate(value))) {
      throw new BadRequestException(
        "Una o más fechas no son fechas calendario válidas en formato yyyymmdd",
      );
    }

    const esServicios = body.concepto === 2 || body.concepto === 3;

    if (
      esServicios &&
      (!body.fechaServicioDesde ||
        !body.fechaServicioHasta ||
        !body.fechaVencimientoPago)
    ) {
      throw new BadRequestException(
        "Para concepto 2 o 3 se requieren fechaServicioDesde, fechaServicioHasta y fechaVencimientoPago",
      );
    }

    if (
      !esServicios &&
      (body.fechaServicioDesde ||
        body.fechaServicioHasta ||
        body.fechaVencimientoPago)
    ) {
      throw new BadRequestException(
        "Para concepto 1 no deben informarse fechas de servicio ni vencimiento de pago",
      );
    }

    if (
      esServicios &&
      body.fechaServicioDesde! > body.fechaServicioHasta!
    ) {
      throw new BadRequestException(
        "fechaServicioDesde no puede ser posterior a fechaServicioHasta",
      );
    }

    if (
      esServicios &&
      body.fechaVencimientoPago! < body.fechaComprobante
    ) {
      throw new BadRequestException(
        "fechaVencimientoPago no puede ser anterior a fechaComprobante",
      );
    }

    const impNeto = this.roundMoney(body.importeNeto);
    const impTrib = this.roundMoney(body.importeTributos ?? 0);
    const impTotal = this.roundMoney(impNeto + impTrib);

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "FECAESolicitar",
      modo: "preparacion",
      enviaArca: false,
      claseComprobante: "C",
      puntoVenta: body.puntoVenta,
      tipoComprobante: body.tipoComprobante,
      numeracion: {
        fuente: "FECompUltimoAutorizado",
        estado: "pendiente_emision",
      },
      detalle: {
        concepto: body.concepto,
        docTipo: body.docTipo,
        docNro: body.docNro,
        condicionIvaReceptorId: body.condicionIvaReceptorId,
        cbteFch: body.fechaComprobante,
        impTotal,
        impTotConc: 0,
        impNeto,
        impOpEx: 0,
        impTrib,
        impIVA: 0,
        fchServDesde: body.fechaServicioDesde ?? null,
        fchServHasta: body.fechaServicioHasta ?? null,
        fchVtoPago: body.fechaVencimientoPago ?? null,
        monId: "PES",
        monCotiz: 1,
      },
    };
  }

  async consultarComprobante(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    puntoVenta: number,
    tipoComprobante: number,
    numeroComprobante: number,
  ): Promise<WsfeComprobanteConsultadoResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.consultar_arca",
        "facturacion.emitir",
      ],
    );

    const cuit = await this.getCommerceCuit(comercioId);
    const { ticket, fromCache } =
      await this.wsaa.getTicketForBackend(
        comercioId,
        ambiente,
        "wsfe",
      );

    const soap = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "<soap:Body>",
      '<FECompConsultar xmlns="http://ar.gov.afip.dif.FEV1/">',
      "<Auth>",
      `<Token>${this.escapeXml(ticket.token)}</Token>`,
      `<Sign>${this.escapeXml(ticket.sign)}</Sign>`,
      `<Cuit>${cuit}</Cuit>`,
      "</Auth>",
      "<FeCompConsReq>",
      `<CbteTipo>${tipoComprobante}</CbteTipo>`,
      `<CbteNro>${numeroComprobante}</CbteNro>`,
      `<PtoVta>${puntoVenta}</PtoVta>`,
      "</FeCompConsReq>",
      "</FECompConsultar>",
      "</soap:Body>",
      "</soap:Envelope>",
    ].join("");

    const response = await fetch(
      this.wsfeUrl(ambiente),
      {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction:
            "http://ar.gov.afip.dif.FEV1/FECompConsultar",
        },
        body: soap,
        signal: AbortSignal.timeout(20_000),
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      const fault = this.extractTag(responseText, "faultstring");
      throw new BadGatewayException(
        fault
          ? `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`
          : `WSFEv1 respondió HTTP ${response.status}`,
      );
    }

    const parsed = this.parseComprobanteConsultado(responseText);

    if (parsed.errores.length > 0) {
      const first = parsed.errores[0];
      throw new BadGatewayException(
        `WSFEv1 devolvió error ${first.codigo}: ${first.mensaje}`,
      );
    }

    if (!parsed.result) {
      throw new BadGatewayException(
        "WSFEv1 respondió sin datos del comprobante consultado",
      );
    }

    const r = parsed.result;
    const numericos = [
      r.puntoVenta,
      r.tipoComprobante,
      r.numeroComprobante,
      r.concepto,
      r.docTipo,
      r.impTotal,
      r.impTotConc,
      r.impNeto,
      r.impOpEx,
      r.impTrib,
      r.impIVA,
      r.monCotiz,
    ];

    if (numericos.some((value) => !Number.isFinite(value))) {
      throw new BadGatewayException(
        "WSFEv1 devolvió datos numéricos inválidos para el comprobante",
      );
    }

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "FECompConsultar",
      ticketOrigen: fromCache ? "cache" : "wsaa",
      puntoVenta: r.puntoVenta,
      tipoComprobante: r.tipoComprobante,
      numeroComprobante: r.numeroComprobante,
      resultado: r.resultado,
      codigoAutorizacion: r.codigoAutorizacion,
      emisionTipo: r.emisionTipo,
      fechaVencimiento: r.fechaVencimiento,
      fechaProceso: r.fechaProceso,
      concepto: r.concepto,
      docTipo: r.docTipo,
      docNro: r.docNro,
      fechaComprobante: r.fechaComprobante,
      importes: {
        total: r.impTotal,
        noGravado: r.impTotConc,
        neto: r.impNeto,
        exento: r.impOpEx,
        tributos: r.impTrib,
        iva: r.impIVA,
      },
      moneda: {
        id: r.monId,
        cotizacion: r.monCotiz,
      },
      condicionIvaReceptorId: r.condicionIvaReceptorId,
      observaciones: r.observaciones,
      eventos: parsed.eventos,
    };
  }

  async getUltimoAutorizado(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    puntoVenta: number,
    tipoComprobante: number,
  ): Promise<WsfeUltimoAutorizadoResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.consultar_arca",
        "facturacion.emitir",
        "facturacion.configurar",
        "facturacion.configurar_arca",
      ],
    );

    if (
      !Number.isInteger(puntoVenta) ||
      puntoVenta <= 0
    ) {
      throw new BadRequestException(
        "puntoVenta debe ser un entero mayor que cero",
      );
    }

    if (
      !Number.isInteger(tipoComprobante) ||
      tipoComprobante <= 0
    ) {
      throw new BadRequestException(
        "tipoComprobante debe ser un entero mayor que cero",
      );
    }

    const cuit = await this.getCommerceCuit(
      comercioId,
    );

    const { ticket, fromCache } =
      await this.wsaa.getTicketForBackend(
        comercioId,
        ambiente,
        "wsfe",
      );

    const token = this.escapeXml(
      ticket.token,
    );
    const sign = this.escapeXml(
      ticket.sign,
    );

    const soap = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "<soap:Body>",
      '<FECompUltimoAutorizado xmlns="http://ar.gov.afip.dif.FEV1/">',
      "<Auth>",
      `<Token>${token}</Token>`,
      `<Sign>${sign}</Sign>`,
      `<Cuit>${cuit}</Cuit>`,
      "</Auth>",
      `<PtoVta>${puntoVenta}</PtoVta>`,
      `<CbteTipo>${tipoComprobante}</CbteTipo>`,
      "</FECompUltimoAutorizado>",
      "</soap:Body>",
      "</soap:Envelope>",
    ].join("");

    const response = await fetch(
      this.wsfeUrl(ambiente),
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/xml; charset=utf-8",
          SOAPAction:
            "http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado",
        },
        body: soap,
        signal: AbortSignal.timeout(
          20_000,
        ),
      },
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      const fault = this.extractTag(
        responseText,
        "faultstring",
      );

      throw new BadGatewayException(
        fault
          ? `WSFEv1 rechazó la solicitud: ${this.decodeXmlEntities(fault)}`
          : `WSFEv1 respondió HTTP ${response.status}`,
      );
    }

    const parsed =
      this.parseUltimoAutorizado(
        responseText,
      );

    if (parsed.errores.length > 0) {
      const first = parsed.errores[0];

      throw new BadGatewayException(
        `WSFEv1 devolvió error ${first.codigo}: ${first.mensaje}`,
      );
    }

    if (
      !Number.isFinite(parsed.puntoVenta) ||
      !Number.isFinite(parsed.tipoComprobante) ||
      !Number.isFinite(parsed.ultimoComprobante)
    ) {
      throw new BadGatewayException(
        "WSFEv1 devolvió una numeración inválida",
      );
    }

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "FECompUltimoAutorizado",
      ticketOrigen:
        fromCache ? "cache" : "wsaa",
      puntoVenta: parsed.puntoVenta,
      tipoComprobante:
        parsed.tipoComprobante,
      ultimoComprobante:
        parsed.ultimoComprobante,
      proximoComprobante:
        parsed.ultimoComprobante + 1,
      eventos: parsed.eventos,
    };
  }


  private tipoComprobanteClaseCDescripcion(tipo: number): string {
    const descripciones: Record<number, string> = {
      11: "Factura C",
      12: "Nota de Debito C",
      13: "Nota de Credito C",
      15: "Recibo C",
    };

    return descripciones[tipo] ?? `Comprobante C ${tipo}`;
  }

  private formatNumeroFiscal(
    puntoVenta: number,
    numeroComprobante: number | null,
  ): string {
    const pv = String(puntoVenta).padStart(5, "0");
    if (numeroComprobante === null) {
      return `${pv}-PENDIENTE`;
    }

    return `${pv}-${String(numeroComprobante).padStart(8, "0")}`;
  }

  private fiscalNumericText(
    value: unknown,
    maxDecimals: number,
    fieldName: string,
  ): string {
    const raw = String(value ?? "").trim();
    const pattern = new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`);

    if (!pattern.test(raw)) {
      throw new ConflictException(
        `El campo fiscal ${fieldName} no tiene un valor numerico valido para construir el QR.`,
      );
    }

    return raw;
  }

  private buildQrFiscal(row: any): {
    version: 1;
    json: string;
    base64: string;
    url: string;
  } {
    const cuit = this.normalizeDigits(row.emisor_cuit);
    const codAut = this.normalizeDigits(row.codigo_autorizacion);
    const docNro = this.normalizeDigits(
      row.receptor_documento_original ??
      row.receptor_documento_numero?.toString(),
    );

    if (cuit.length !== 11) {
      throw new ConflictException(
        "El comprobante autorizado no tiene un CUIT emisor valido para generar el QR.",
      );
    }

    if (!/^\\d{14}$/.test(codAut)) {
      throw new ConflictException(
        "El comprobante autorizado no tiene un codigo de autorizacion de 14 digitos.",
      );
    }

    if (!row.fecha_emision) {
      throw new ConflictException(
        "El comprobante autorizado no tiene fecha de emision para generar el QR.",
      );
    }

    if (!row.punto_venta_numero || !row.tipo_comprobante_arca || !row.numero_comprobante) {
      throw new ConflictException(
        "El comprobante autorizado no tiene numeracion fiscal completa para generar el QR.",
      );
    }

    const importe = this.fiscalNumericText(row.imp_total, 2, "importe");
    const ctz = this.fiscalNumericText(row.moneda_cotizacion, 6, "ctz");
    const moneda = String(row.moneda_id_arca ?? "PES").trim().toUpperCase();

    if (!/^[A-Z0-9]{3}$/.test(moneda)) {
      throw new ConflictException(
        "El comprobante autorizado no tiene una moneda ARCA valida para generar el QR.",
      );
    }

    const parts = [
      '"ver":1',
      `"fecha":${JSON.stringify(String(row.fecha_emision))}`,
      `"cuit":${cuit}`,
      `"ptoVta":${Number(row.punto_venta_numero)}`,
      `"tipoCmp":${Number(row.tipo_comprobante_arca)}`,
      `"nroCmp":${Number(row.numero_comprobante)}`,
      `"importe":${importe}`,
      `"moneda":${JSON.stringify(moneda)}`,
      `"ctz":${ctz}`,
    ];

    const docTipo = Number(row.receptor_documento_tipo_arca ?? 0);
    if (
      Number.isFinite(docTipo) &&
      docTipo > 0 &&
      docTipo !== 99 &&
      docNro.length > 0 &&
      docNro !== "0"
    ) {
      parts.push(`"tipoDocRec":${docTipo}`);
      // Se inserta como literal numerico para conservar hasta 20 digitos sin
      // convertirlo a Number de JavaScript y perder precision.
      parts.push(`"nroDocRec":${docNro}`);
    }

    const tipoCodAut = row.tipo_autorizacion === "caea" ? "A" : "E";
    parts.push(`"tipoCodAut":${JSON.stringify(tipoCodAut)}`);
    parts.push(`"codAut":${codAut}`);

    const json = `{${parts.join(",")}}`;
    const base64 = Buffer.from(json, "utf8").toString("base64");

    return {
      version: 1,
      json,
      base64,
      url: `https://www.arca.gob.ar/fe/qr/?p=${base64}`,
    };
  }

  private arcaDateToIso(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  private async getPersistedFiscalByKey(
    claveIdempotencia: string,
  ): Promise<any | null> {
    const { data, error } = await this.supabase.client
      .from("comprobantes_fiscales")
      .select(
        "id,comercio_id,clave_idempotencia,solicitud_hash,estado,punto_venta_id,punto_venta_numero,tipo_comprobante_arca,numero_comprobante,intentos_envio,arca_request_resumen,arca_response_resumen,codigo_autorizacion,autorizacion_vencimiento,resultado_arca,arca_fecha_proceso,autorizado_at,rechazado_at",
      )
      .eq("clave_idempotencia", claveIdempotencia)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ?? null;
  }

  async persistirCaeC(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    body: EmitirCaeCIdempotenteDto,
  ): Promise<WsfePersistenciaCaeCResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      ["facturacion.preparar", "facturacion.emitir"],
    );

    // Reutiliza las validaciones locales del Paso 6. No llama a ARCA.
    const preparacion = await this.prepararCaeC(
      user,
      comercioId,
      ambiente,
      body,
    );

    const emisor =
      await this.getCommerceFiscalSnapshot(
        comercioId,
      );

    const cuit = emisor.cuit;
    const d = preparacion.detalle;

    // Payload canónico y sanitizado: jamás contiene Token, Sign,
    // certificado ni clave privada.
    const requestResumen = {
      version: 1,
      comercioId,
      ambiente,
      ventaId: body.ventaId ?? null,
      clienteId: body.clienteId ?? null,
      puntoVenta: body.puntoVenta,
      tipoComprobante: body.tipoComprobante,
      concepto: d.concepto,
      docTipo: d.docTipo,
      docNro: d.docNro,
      condicionIvaReceptorId: d.condicionIvaReceptorId,
      cbteFch: d.cbteFch,
      impTotal: d.impTotal,
      impTotConc: d.impTotConc,
      impNeto: d.impNeto,
      impOpEx: d.impOpEx,
      impTrib: d.impTrib,
      impIVA: d.impIVA,
      fchServDesde: d.fchServDesde,
      fchServHasta: d.fchServHasta,
      fchVtoPago: d.fchVtoPago,
      monId: d.monId,
      monCotiz: d.monCotiz,
    };

    const solicitudHash = createHash("sha256")
      .update(JSON.stringify(requestResumen), "utf8")
      .digest("hex");

    let existente = await this.getPersistedFiscalByKey(
      body.claveIdempotencia,
    );

    if (existente) {
      if (existente.comercio_id !== comercioId) {
        throw new ConflictException(
          "La clave de idempotencia ya fue utilizada en otro comercio.",
        );
      }

      if (existente.solicitud_hash !== solicitudHash) {
        throw new ConflictException(
          "La clave de idempotencia ya existe pero corresponde a un payload fiscal diferente. Generá una nueva clave para una operación distinta.",
        );
      }

      return {
        ok: true,
        ambiente,
        servicio: "wsfev1",
        operacion: "PERSISTIR_COMPROBANTE_C",
        modo: "persistencia",
        enviaArca: false,
        comprobanteFiscalId: existente.id,
        claveIdempotencia: existente.clave_idempotencia,
        solicitudHash,
        estado: existente.estado,
        reutilizada: true,
        puntoVenta: existente.punto_venta_numero ?? body.puntoVenta,
        tipoComprobante:
          existente.tipo_comprobante_arca ?? body.tipoComprobante,
        mensaje:
          "La misma operación lógica ya estaba registrada. Drito reutilizó el comprobante fiscal existente y no creó un duplicado.",
      };
    }

    const ventaItemsSnapshot = body.ventaId
      ? await this.getVentaItemsFiscalSnapshot(
          comercioId,
          body.ventaId,
        )
      : [];

    const receptor =
      await this.getClienteFiscalSnapshot(
        comercioId,
        body.clienteId,
      );

    let receptorDocumentoNumero: string;

    try {
      const valor = BigInt(d.docNro);
      if (valor > 9223372036854775807n) {
        throw new Error("fuera de bigint");
      }
      receptorDocumentoNumero = valor.toString();
    } catch {
      throw new BadRequestException(
        "docNro excede el rango admitido para persistencia fiscal.",
      );
    }

    const insertPayload = {
      comercio_id: comercioId,
      venta_id: body.ventaId ?? null,
      cliente_id: body.clienteId ?? null,
      origen: body.ventaId ? "venta" : "manual",
      punto_venta_numero: body.puntoVenta,
      ambiente_arca: ambiente,
      servicio_arca: "wsfev1",
      tipo_comprobante_arca: body.tipoComprobante,
      concepto_arca: d.concepto,
      estado: "borrador",
      fecha_emision: this.arcaDateToIso(d.cbteFch),
      fecha_servicio_desde: this.arcaDateToIso(d.fchServDesde),
      fecha_servicio_hasta: this.arcaDateToIso(d.fchServHasta),
      fecha_vencimiento_pago: this.arcaDateToIso(d.fchVtoPago),
      emisor_cuit: cuit,
      emisor_razon_social: emisor.razonSocial,
      emisor_nombre_comercial: emisor.nombreComercial,
      emisor_condicion_iva: emisor.condicionIva,
      emisor_ingresos_brutos: emisor.ingresosBrutos,
      emisor_inicio_actividades: emisor.inicioActividades,
      emisor_domicilio_fiscal: emisor.domicilioFiscal,

      receptor_nombre:
        receptor?.nombre ??
        (
          d.docTipo === 99 &&
            String(d.docNro) === "0"
            ? "Consumidor Final"
            : null
        ),

      receptor_documento_tipo_arca: d.docTipo,
      receptor_documento_numero: receptorDocumentoNumero,
      receptor_documento_original: d.docNro,
      receptor_condicion_iva_id: d.condicionIvaReceptorId,

      receptor_domicilio:
        receptor?.domicilio ?? null,

      receptor_email:
        receptor?.email ?? null,
      moneda_id_arca: d.monId,
      moneda_cotizacion: d.monCotiz,
      imp_total: d.impTotal,
      imp_tot_conc: d.impTotConc,
      imp_neto: d.impNeto,
      imp_op_ex: d.impOpEx,
      imp_trib: d.impTrib,
      imp_iva: d.impIVA,
      arca_request_resumen: requestResumen,
      clave_idempotencia: body.claveIdempotencia,
      solicitud_hash: solicitudHash,
      creado_por: user.id,
    };

    const { data, error } = await this.supabase.client
      .from("comprobantes_fiscales")
      .insert(insertPayload)
      .select(
        "id,clave_idempotencia,solicitud_hash,estado,punto_venta_numero,tipo_comprobante_arca",
      )
      .single();

    if (error) {
      // Dos requests idénticos pueden llegar prácticamente juntos.
      // El índice UNIQUE de clave_idempotencia decide quién crea la fila;
      // el segundo reutiliza la ganadora en vez de duplicarla.
      if (error.code === "23505") {
        existente = await this.getPersistedFiscalByKey(
          body.claveIdempotencia,
        );

        if (
          existente &&
          existente.comercio_id === comercioId &&
          existente.solicitud_hash === solicitudHash
        ) {
          return {
            ok: true,
            ambiente,
            servicio: "wsfev1",
            operacion: "PERSISTIR_COMPROBANTE_C",
            modo: "persistencia",
            enviaArca: false,
            comprobanteFiscalId: existente.id,
            claveIdempotencia: existente.clave_idempotencia,
            solicitudHash,
            estado: existente.estado,
            reutilizada: true,
            puntoVenta:
              existente.punto_venta_numero ?? body.puntoVenta,
            tipoComprobante:
              existente.tipo_comprobante_arca ?? body.tipoComprobante,
            mensaje:
              "Una llamada concurrente ya había creado esta operación. Se reutilizó el mismo comprobante fiscal.",
          };
        }
      }

      throw error;
    }


    if (body.ventaId && ventaItemsSnapshot.length > 0) {
      const itemsParaInsertar = ventaItemsSnapshot.map((item) => ({
        ...item,
        comprobante_fiscal_id: data.id,
        comercio_id: comercioId,
      }));

      const { error: itemsInsertError } = await this.supabase.client
        .from("items_comprobantes_fiscales")
        .insert(itemsParaInsertar);

      if (itemsInsertError) {
        // El encabezado todavía es un borrador y no se llamó a ARCA.
        // Si falla el snapshot de items, eliminamos ese encabezado nuevo para
        // no dejar una operación fiscal incompleta bloqueada por idempotencia.
        const { error: cleanupError } = await this.supabase.client
          .from("comprobantes_fiscales")
          .delete()
          .eq("id", data.id)
          .eq("estado", "borrador");

        if (cleanupError) {
          throw new ConflictException(
            `No se pudo persistir el detalle fiscal de la venta y tampoco limpiar el borrador incompleto. Error de items: ${itemsInsertError.message}. Error de limpieza: ${cleanupError.message}.`,
          );
        }

        throw itemsInsertError;
      }
    }

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "PERSISTIR_COMPROBANTE_C",
      modo: "persistencia",
      enviaArca: false,
      comprobanteFiscalId: data.id,
      claveIdempotencia: data.clave_idempotencia,
      solicitudHash: data.solicitud_hash,
      estado: data.estado,
      reutilizada: false,
      puntoVenta: data.punto_venta_numero,
      tipoComprobante: data.tipo_comprobante_arca,
      mensaje:
        "Borrador fiscal persistido. Todavía no se solicitó CAE ni se consumió numeración fiscal.",
    };
  }


  async prevalidarCaeCIdempotente(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    body: EmitirCaeCIdempotenteDto,
  ): Promise<WsfePrevalidacionCaeCIdempotenteResult> {
    // Primero fija la identidad lógica del comprobante en base de datos.
    // Si ARCA rechaza la prevalidación (por ejemplo, porque todavía no hay
    // punto de venta), la fila queda en borrador y puede retomarse con la
    // misma clave sin crear duplicados.
    const persistencia = await this.persistirCaeC(
      user,
      comercioId,
      ambiente,
      body,
    );

    if (persistencia.estado !== "borrador") {
      const mensajes: Record<string, string> = {
        pendiente_autorizacion:
          "El comprobante ya quedó preparado para autorización fiscal. No se vuelve a prevalidar automáticamente.",
        enviando:
          "El comprobante ya está en proceso de envío a ARCA. No se permite iniciar otro intento.",
        incierto:
          "El comprobante tiene resultado incierto. Debe reconciliarse con ARCA antes de cualquier nuevo intento.",
        autorizado:
          "El comprobante ya fue autorizado. No se puede volver a emitir.",
        rechazado:
          "El comprobante ya tiene un rechazo fiscal registrado. Corregí la operación antes de generar un nuevo intento.",
        error:
          "El comprobante quedó en estado de error. Requiere una acción explícita antes de reintentar.",
        descartado:
          "El comprobante fue descartado y no puede continuar con esta clave.",
      };

      throw new ConflictException(
        mensajes[persistencia.estado] ??
        `El comprobante fiscal está en estado ${persistencia.estado} y no puede prevalidarse automáticamente.`,
      );
    }

    // Esta llamada consulta ARCA (condición IVA, puntos de venta y último
    // autorizado), pero NO ejecuta FECAESolicitar ni cambia la numeración.
    // Con el CUIT actual sin punto de venta, aquí debe producirse el 409
    // controlado y el borrador persistido permanece intacto.
    const prevalidacion = await this.prevalidarCaeC(
      user,
      comercioId,
      ambiente,
      body,
    );

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "PREVALIDAR_EMISION_C_IDEMPOTENTE",
      modo: "prevalidacion_idempotente",
      enviaArca: false,
      comprobanteFiscalId: persistencia.comprobanteFiscalId,
      claveIdempotencia: persistencia.claveIdempotencia,
      reutilizada: persistencia.reutilizada,
      estado: "borrador",
      prevalidacion,
      mensaje:
        "La operación quedó identificada de forma idempotente y pasó la prevalidación. Todavía no se solicitó CAE ni se consumió numeración fiscal.",
    };
  }


  private async getPersistedFiscalById(
    comprobanteFiscalId: string,
  ): Promise<any | null> {
    const { data, error } = await this.supabase.client
      .from("comprobantes_fiscales")
      .select(
        "id,comercio_id,clave_idempotencia,solicitud_hash,estado,punto_venta_id,punto_venta_numero,tipo_comprobante_arca,numero_comprobante,intentos_envio,arca_request_resumen,arca_response_resumen,codigo_autorizacion,autorizacion_vencimiento,resultado_arca,arca_fecha_proceso,autorizado_at,rechazado_at",
      )
      .eq("id", comprobanteFiscalId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ?? null;
  }

  private async ensureLocalPuntoVentaFiscal(
    comercioId: string,
    ambiente: AmbienteArca,
    punto: WsfePuntoVenta,
  ): Promise<string> {
    const now = new Date().toISOString();

    const { data: existente, error: selectError } =
      await this.supabase.client
        .from("puntos_venta_fiscales")
        .select("id")
        .eq("comercio_id", comercioId)
        .eq("ambiente_arca", ambiente)
        .eq("numero", punto.numero)
        .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    if (existente?.id) {
      const { error: updateError } = await this.supabase.client
        .from("puntos_venta_fiscales")
        .update({
          arca_habilitado: true,
          ultimo_control_arca_at: now,
          ultimo_error_arca: null,
        })
        .eq("id", existente.id);

      if (updateError) {
        throw updateError;
      }

      return existente.id;
    }

    const { data, error } = await this.supabase.client
      .from("puntos_venta_fiscales")
      .insert({
        comercio_id: comercioId,
        numero: punto.numero,
        ambiente_arca: ambiente,
        servicio: "wsfev1",
        descripcion: `Punto de venta ${punto.numero} - WSFEv1`,
        activo: true,
        es_predeterminado: false,
        arca_habilitado: true,
        ultimo_control_arca_at: now,
        ultimo_error_arca: null,
      })
      .select("id")
      .single();

    if (error) {
      // Puede existir una carrera entre dos prevalidaciones simultáneas.
      // La restricción UNIQUE de puntos_venta_fiscales decide la ganadora.
      if (error.code === "23505") {
        const { data: ganador, error: retryError } =
          await this.supabase.client
            .from("puntos_venta_fiscales")
            .select("id")
            .eq("comercio_id", comercioId)
            .eq("ambiente_arca", ambiente)
            .eq("numero", punto.numero)
            .single();

        if (retryError) {
          throw retryError;
        }

        return ganador.id;
      }

      throw error;
    }

    return data.id;
  }

  private fiscalResultFromPersisted(
    ambiente: AmbienteArca,
    row: any,
    reutilizada: boolean,
  ): WsfeEmisionCaeCIdempotenteResult {
    const autorizado = row.estado === "autorizado";

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "FECAESolicitar",
      modo: "emision_idempotente",
      comprobanteFiscalId: row.id,
      claveIdempotencia: row.clave_idempotencia,
      reutilizada,
      persistido: true,
      ticketOrigen: null,
      estado: autorizado ? "autorizado" : "rechazado",
      estadoPersistido: row.estado,
      autorizado,
      recuperadoPor: null,
      puntoVenta: Number(row.punto_venta_numero ?? 0),
      tipoComprobante: Number(row.tipo_comprobante_arca ?? 0),
      numeroComprobante: Number(row.numero_comprobante ?? 0),
      resultado: row.resultado_arca ?? (autorizado ? "A" : "R"),
      cae: row.codigo_autorizacion ?? "",
      caeVencimiento: row.autorizacion_vencimiento ?? "",
      fechaProceso: row.arca_fecha_proceso ?? "",
      observaciones: [],
      errores: [],
      eventos: [],
      mensaje: autorizado
        ? "La operación ya estaba autorizada. Drito devolvió el comprobante persistido sin volver a solicitar CAE."
        : "La operación ya tiene un rechazo persistido. Drito no volvió a solicitar CAE con la misma clave.",
    };
  }

  private async reserveFiscalNumber(
    comprobanteFiscalId: string,
    comercioId: string,
    ambiente: AmbienteArca,
    prevalidacion: WsfePrevalidacionCaeCResult,
  ): Promise<any> {
    const puntoVentaId = await this.ensureLocalPuntoVentaFiscal(
      comercioId,
      ambiente,
      prevalidacion.puntoVenta,
    );

    const numero = prevalidacion.numeracion.proximoComprobante;
    const requestResumen = {
      ...(await this.getPersistedFiscalById(comprobanteFiscalId))
        ?.arca_request_resumen,
      numeroComprobante: numero,
      numeracionFuente: "FECompUltimoAutorizado",
    };

    const { data, error } = await this.supabase.client
      .from("comprobantes_fiscales")
      .update({
        punto_venta_id: puntoVentaId,
        punto_venta_numero: prevalidacion.puntoVenta.numero,
        numero_comprobante: numero,
        estado: "pendiente_autorizacion",
        arca_request_resumen: requestResumen,
      })
      .eq("id", comprobanteFiscalId)
      .eq("estado", "borrador")
      .select(
        "id,comercio_id,clave_idempotencia,solicitud_hash,estado,punto_venta_id,punto_venta_numero,tipo_comprobante_arca,numero_comprobante,intentos_envio,arca_request_resumen,arca_response_resumen,codigo_autorizacion,autorizacion_vencimiento,resultado_arca,arca_fecha_proceso,autorizado_at,rechazado_at",
      )
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        throw new ConflictException(
          "El próximo número fiscal ya quedó reservado por otra emisión del mismo punto de venta y tipo. Esperá a que finalice esa operación y volvé a intentar; no se solicitó CAE para este comprobante.",
        );
      }

      throw error;
    }

    if (data) {
      return data;
    }

    const actual = await this.getPersistedFiscalById(
      comprobanteFiscalId,
    );

    if (!actual) {
      throw new ConflictException(
        "El comprobante fiscal dejó de estar disponible durante la reserva de numeración.",
      );
    }

    return actual;
  }

  private async claimFiscalSending(
    comprobanteFiscalId: string,
  ): Promise<any> {
    const actual = await this.getPersistedFiscalById(
      comprobanteFiscalId,
    );

    if (!actual) {
      throw new ConflictException(
        "No se encontró el comprobante fiscal a enviar.",
      );
    }

    if (actual.estado !== "pendiente_autorizacion") {
      if (actual.estado === "autorizado" || actual.estado === "rechazado") {
        return actual;
      }

      throw new ConflictException(
        actual.estado === "enviando"
          ? "El comprobante ya está siendo enviado a ARCA. No se inició otro intento."
          : actual.estado === "incierto"
            ? "El comprobante tiene resultado incierto y debe reconciliarse antes de cualquier reintento."
            : `El comprobante está en estado ${actual.estado} y no puede enviarse automáticamente.`,
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await this.supabase.client
      .from("comprobantes_fiscales")
      .update({
        estado: "enviando",
        envio_iniciado_at: now,
        solicitado_at: now,
        intentos_envio: Number(actual.intentos_envio ?? 0) + 1,
      })
      .eq("id", comprobanteFiscalId)
      .eq("estado", "pendiente_autorizacion")
      .select(
        "id,comercio_id,clave_idempotencia,solicitud_hash,estado,punto_venta_id,punto_venta_numero,tipo_comprobante_arca,numero_comprobante,intentos_envio,arca_request_resumen,arca_response_resumen,codigo_autorizacion,autorizacion_vencimiento,resultado_arca,arca_fecha_proceso,autorizado_at,rechazado_at",
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data;
    }

    const ganador = await this.getPersistedFiscalById(
      comprobanteFiscalId,
    );

    throw new ConflictException(
      ganador?.estado === "enviando"
        ? "Otra llamada ya tomó el envío de este comprobante. No se inició un segundo FECAESolicitar."
        : `No fue posible tomar el envío fiscal. Estado actual: ${ganador?.estado ?? "desconocido"}.`,
    );
  }

  private async persistFiscalAuthorized(
    comprobanteFiscalId: string,
    result: WsfeEmisionCaeCResult,
    fromState: "enviando" | "incierto",
  ): Promise<void> {
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      estado: "autorizado",
      numero_comprobante: result.numeroComprobante,
      tipo_autorizacion: "cae",
      codigo_autorizacion: result.cae,
      autorizacion_vencimiento:
        this.arcaDateToIso(result.caeVencimiento),
      resultado_arca: result.resultado || "A",
      arca_response_resumen: {
        estado: result.estado,
        resultado: result.resultado,
        numeroComprobante: result.numeroComprobante,
        cae: result.cae,
        caeVencimiento: result.caeVencimiento,
        fechaProceso: result.fechaProceso,
        observaciones: result.observaciones,
        errores: result.errores,
        eventos: result.eventos,
        recuperadoPor: result.recuperadoPor,
      },
      autorizado_at: now,
      resultado_incierto_at: null,
    };

    if (fromState === "incierto") {
      updatePayload.ultima_recuperacion_at = now;
    }

    const { error } = await this.supabase.client
      .from("comprobantes_fiscales")
      .update(updatePayload)
      .eq("id", comprobanteFiscalId)
      .eq("estado", fromState);

    if (error) {
      throw error;
    }
  }

  private async persistFiscalRejected(
    comprobanteFiscalId: string,
    result: WsfeEmisionCaeCResult,
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from("comprobantes_fiscales")
      .update({
        estado: "rechazado",
        resultado_arca: result.resultado || "R",
        arca_response_resumen: {
          estado: result.estado,
          resultado: result.resultado,
          numeroComprobante: result.numeroComprobante,
          observaciones: result.observaciones,
          errores: result.errores,
          eventos: result.eventos,
        },
        rechazado_at: new Date().toISOString(),
      })
      .eq("id", comprobanteFiscalId)
      .eq("estado", "enviando");

    if (error) {
      throw error;
    }
  }

  private async persistFiscalUncertain(
    comprobanteFiscalId: string,
    error: unknown,
  ): Promise<void> {
    const now = new Date().toISOString();
    const mensaje =
      error instanceof Error ? error.message : "Error de comunicación desconocido";

    const { error: dbError } = await this.supabase.client
      .from("comprobantes_fiscales")
      .update({
        estado: "incierto",
        resultado_incierto_at: now,
        arca_response_resumen: {
          estado: "incierto",
          mensaje,
          nota:
            "No se reintenta automáticamente. Debe consultarse el comprobante exacto en ARCA.",
        },
      })
      .eq("id", comprobanteFiscalId)
      .eq("estado", "enviando");

    if (dbError) {
      throw dbError;
    }
  }

  private async tryRecoverAuthorizedFiscal(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    comprobanteFiscalId: string,
    puntoVenta: number,
    tipoComprobante: number,
    numeroComprobante: number,
    ticketOrigen: "wsaa" | "cache",
  ): Promise<WsfeEmisionCaeCResult | null> {
    try {
      const recuperado = await this.consultarComprobante(
        user,
        comercioId,
        ambiente,
        puntoVenta,
        tipoComprobante,
        numeroComprobante,
      );

      await this.supabase.client
        .from("comprobantes_fiscales")
        .update({ ultima_recuperacion_at: new Date().toISOString() })
        .eq("id", comprobanteFiscalId)
        .eq("estado", "incierto");

      if (
        recuperado.resultado.trim().toUpperCase() !== "A" ||
        !recuperado.codigoAutorizacion
      ) {
        return null;
      }

      return {
        ok: true,
        ambiente,
        servicio: "wsfev1",
        operacion: "FECAESolicitar",
        ticketOrigen,
        estado: "autorizado_recuperado",
        autorizado: true,
        recuperadoPor: "FECompConsultar",
        puntoVenta: recuperado.puntoVenta,
        tipoComprobante: recuperado.tipoComprobante,
        numeroComprobante: recuperado.numeroComprobante,
        resultado: recuperado.resultado,
        cae: recuperado.codigoAutorizacion,
        caeVencimiento: recuperado.fechaVencimiento,
        fechaProceso: recuperado.fechaProceso,
        observaciones: recuperado.observaciones,
        errores: [],
        eventos: recuperado.eventos,
      };
    } catch {
      await this.supabase.client
        .from("comprobantes_fiscales")
        .update({ ultima_recuperacion_at: new Date().toISOString() })
        .eq("id", comprobanteFiscalId)
        .eq("estado", "incierto");

      return null;
    }
  }

  async getRepresentacionFiscal(
    user: AuthUser,
    comercioId: string,
    comprobanteFiscalId: string,
  ): Promise<WsfeRepresentacionFiscalResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      [
        "facturacion.ver",
        "facturacion.preparar",
        "facturacion.emitir",
      ],
    );

    const { data: row, error } = await this.supabase.client
      .from("comprobantes_fiscales")
      .select(
        "id,comercio_id,estado,clase,tipo_comprobante_arca,punto_venta_numero,numero_comprobante,fecha_emision,emisor_razon_social,emisor_nombre_comercial,emisor_cuit,emisor_condicion_iva,emisor_ingresos_brutos,emisor_inicio_actividades,emisor_domicilio_fiscal,receptor_nombre,receptor_documento_tipo_arca,receptor_documento_numero,receptor_documento_original,receptor_condicion_iva_id,receptor_domicilio,receptor_email,moneda_id_arca,moneda_cotizacion,imp_total,imp_tot_conc,imp_neto,imp_op_ex,imp_trib,imp_iva,tipo_autorizacion,codigo_autorizacion,autorizacion_vencimiento,resultado_arca,leyenda_factura",
      )
      .eq("id", comprobanteFiscalId)
      .eq("comercio_id", comercioId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!row) {
      throw new BadRequestException(
        "No se encontro el comprobante fiscal solicitado dentro de este comercio.",
      );
    }

    const tipoComprobante = Number(row.tipo_comprobante_arca ?? 0);
    if (![11, 12, 13, 15].includes(tipoComprobante)) {
      throw new BadRequestException(
        "La representacion grafica del Paso 11 admite comprobantes clase C (11, 12, 13 y 15).",
      );
    }

    const puntoVenta = Number(row.punto_venta_numero ?? 0);
    if (!Number.isFinite(puntoVenta) || puntoVenta <= 0) {
      throw new ConflictException(
        "El comprobante no tiene un punto de venta fiscal valido.",
      );
    }

    const numeroComprobante = row.numero_comprobante == null
      ? null
      : Number(row.numero_comprobante);

    const { data: itemsData, error: itemsError } = await this.supabase.client
      .from("items_comprobantes_fiscales")
      .select(
        "codigo,nombre,descripcion,unidad_medida,cantidad,precio_unitario,descuento_porcentaje,descuento_importe,subtotal,total,orden",
      )
      .eq("comprobante_fiscal_id", comprobanteFiscalId)
      .eq("comercio_id", comercioId)
      .order("orden", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    const items = (itemsData ?? []).map((item: any) => ({
      codigo: item.codigo ?? null,
      nombre: String(item.nombre ?? ""),
      descripcion: item.descripcion ?? null,
      unidadMedida: String(item.unidad_medida ?? "unidad"),
      cantidad: Number(item.cantidad ?? 0),
      precioUnitario: Number(item.precio_unitario ?? 0),
      descuentoPorcentaje: Number(item.descuento_porcentaje ?? 0),
      descuentoImporte: Number(item.descuento_importe ?? 0),
      subtotal: Number(item.subtotal ?? 0),
      total: Number(item.total ?? 0),
    }));

    const autorizado =
      row.estado === "autorizado" &&
      numeroComprobante !== null &&
      Boolean(row.codigo_autorizacion) &&
      Boolean(row.autorizacion_vencimiento);

    const qr = autorizado ? this.buildQrFiscal(row) : null;
    const faltantes: string[] = [];

    if (!row.emisor_razon_social) {
      faltantes.push(
        "apellido y nombres, denominacion o razon social del emisor",
      );
    }
    if (!row.emisor_domicilio_fiscal) {
      faltantes.push("domicilio del emisor");
    }
    if (!row.emisor_condicion_iva) {
      faltantes.push("condicion IVA del emisor");
    }
    if (!row.emisor_ingresos_brutos) {
      faltantes.push(
        "ingresos brutos o condicion de no contribuyente del emisor",
      );
    }
    if (!row.emisor_inicio_actividades) {
      faltantes.push("inicio de actividades del emisor");
    }
    if (!row.receptor_nombre) {
      faltantes.push("nombre del receptor");
    }
    if (items.length === 0) {
      faltantes.push("detalle de items del comprobante");
    }
    if (!autorizado) {
      faltantes.push("CAE/CAEA y numeracion autorizada por ARCA");
    }

    const cuit = this.normalizeDigits(row.emisor_cuit);
    if (cuit.length !== 11) {
      faltantes.push("CUIT valido del emisor");
    }

    return {
      ok: true,
      servicio: "wsfev1",
      operacion: "REPRESENTACION_GRAFICA_C",
      comprobanteFiscalId,
      estadoPersistido: row.estado,
      clase: "C",
      listoParaPdfFiscal: autorizado && faltantes.length === 0,
      documento: {
        tipoComprobante,
        tipoDescripcion: this.tipoComprobanteClaseCDescripcion(tipoComprobante),
        letra: "C",
        codigoVisual: `COD. ${String(tipoComprobante).padStart(3, "0")}`,
        puntoVenta,
        numeroComprobante,
        numeroFormateado: this.formatNumeroFiscal(
          puntoVenta,
          numeroComprobante,
        ),
        fechaEmision: String(row.fecha_emision),
      },
      emisor: {
        razonSocial: row.emisor_razon_social ?? null,
        nombreComercial: row.emisor_nombre_comercial ?? null,
        cuit,
        condicionIva: row.emisor_condicion_iva ?? null,
        ingresosBrutos: row.emisor_ingresos_brutos ?? null,
        inicioActividades: row.emisor_inicio_actividades ?? null,
        domicilioFiscal: row.emisor_domicilio_fiscal ?? null,
      },
      receptor: {
        nombre: row.receptor_nombre ?? null,
        documentoTipoArca: row.receptor_documento_tipo_arca == null
          ? null
          : Number(row.receptor_documento_tipo_arca),
        documentoNumero:
          row.receptor_documento_original ??
          row.receptor_documento_numero?.toString() ??
          null,
        condicionIvaId: row.receptor_condicion_iva_id == null
          ? null
          : Number(row.receptor_condicion_iva_id),
        domicilio: row.receptor_domicilio ?? null,
        email: row.receptor_email ?? null,
      },
      items,
      importes: {
        total: Number(row.imp_total ?? 0),
        neto: Number(row.imp_neto ?? 0),
        tributos: Number(row.imp_trib ?? 0),
        iva: Number(row.imp_iva ?? 0),
        exento: Number(row.imp_op_ex ?? 0),
        noGravado: Number(row.imp_tot_conc ?? 0),
        moneda: String(row.moneda_id_arca ?? "PES"),
        cotizacion: Number(row.moneda_cotizacion ?? 1),
      },
      autorizacion: autorizado
        ? {
          tipo: row.tipo_autorizacion === "caea" ? "CAEA" : "CAE",
          codigo: String(row.codigo_autorizacion),
          vencimiento: String(row.autorizacion_vencimiento),
        }
        : null,
      qr,
      pdf: {
        formato: "A4",
        marcaAgua: autorizado
          ? null
          : "BORRADOR - NO VALIDO COMO COMPROBANTE FISCAL",
        secciones: [
          "encabezado",
          "emisor",
          "receptor",
          "detalle",
          "totales",
          "autorizacion",
          "qr",
        ],
        faltantesParaEmisionGrafica: faltantes,
      },
      mensaje: autorizado
        ? "La representacion contiene datos de autorizacion y QR fiscal ARCA. Solo debe imprimirse como comprobante fiscal cuando listoParaPdfFiscal sea true."
        : "Vista previa estructural: el comprobante aun no esta autorizado por ARCA, por lo que no tiene QR fiscal y debe mostrarse con marca de agua de borrador.",
    };
  }

  async emitirCaeCIdempotente(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    body: EmitirCaeCIdempotenteDto,
  ): Promise<WsfeEmisionCaeCIdempotenteResult> {
    await this.permissions.assertAny(
      user.id,
      comercioId,
      ["facturacion.emitir"],
    );

    if (ambiente !== "homologacion") {
      throw new ConflictException(
        "La emisión idempotente en producción permanece bloqueada hasta completar configuración y validación productiva.",
      );
    }

    if (this.roundMoney(body.importeTributos ?? 0) !== 0) {
      throw new BadRequestException(
        "La emisión idempotente inicial de Factura C admite importeTributos = 0 hasta incorporar el detalle obligatorio de tributos.",
      );
    }

    const persistencia = await this.persistirCaeC(
      user,
      comercioId,
      ambiente,
      body,
    );

    let fiscal = await this.getPersistedFiscalById(
      persistencia.comprobanteFiscalId,
    );

    if (!fiscal) {
      throw new ConflictException(
        "No se pudo recuperar el comprobante fiscal persistido.",
      );
    }

    if (fiscal.estado === "autorizado" || fiscal.estado === "rechazado") {
      return this.fiscalResultFromPersisted(
        ambiente,
        fiscal,
        true,
      );
    }

    if (fiscal.estado === "enviando") {
      throw new ConflictException(
        "El comprobante ya está en proceso de envío a ARCA. No se inició otro FECAESolicitar.",
      );
    }

    if (fiscal.estado === "incierto") {
      throw new ConflictException(
        "El comprobante tiene resultado incierto. Debe reconciliarse con FECompConsultar antes de cualquier reintento.",
      );
    }

    if (fiscal.estado === "error" || fiscal.estado === "descartado") {
      throw new ConflictException(
        `El comprobante está en estado ${fiscal.estado} y requiere una acción explícita antes de continuar.`,
      );
    }

    let prevalidacion: WsfePrevalidacionCaeCResult;

    if (fiscal.estado === "borrador") {
      // Si ARCA bloquea aquí (por ejemplo, no existe punto de venta),
      // la fila sigue en borrador y no se consume numeración.
      prevalidacion = await this.prevalidarCaeC(
        user,
        comercioId,
        ambiente,
        body,
      );

      fiscal = await this.reserveFiscalNumber(
        fiscal.id,
        comercioId,
        ambiente,
        prevalidacion,
      );
    } else if (fiscal.estado === "pendiente_autorizacion") {
      if (!fiscal.numero_comprobante) {
        throw new ConflictException(
          "El comprobante está pendiente de autorización pero no tiene número fiscal reservado.",
        );
      }

      // Si una llamada anterior reservó el número y el proceso se cortó antes
      // del envío, verificamos nuevamente ARCA antes de tomar el lock de envío.
      // Si otro sistema consumió ese número, esta fila pasa a error y nunca se
      // intenta enviar con una numeración obsoleta.
      prevalidacion = await this.prevalidarCaeC(
        user,
        comercioId,
        ambiente,
        body,
      );

      if (
        prevalidacion.numeracion.proximoComprobante !==
        Number(fiscal.numero_comprobante)
      ) {
        const { error: staleError } = await this.supabase.client
          .from("comprobantes_fiscales")
          .update({
            estado: "error",
            observaciones:
              "La numeración oficial de ARCA cambió después de reservar el comprobante. Se requiere un nuevo intento lógico con otra clave de idempotencia.",
          })
          .eq("id", fiscal.id)
          .eq("estado", "pendiente_autorizacion");

        if (staleError) {
          throw staleError;
        }

        throw new ConflictException(
          `La numeración oficial cambió: Drito tenía reservado ${fiscal.numero_comprobante} pero ARCA informa ${prevalidacion.numeracion.proximoComprobante} como próximo. No se solicitó CAE; generá un nuevo intento fiscal.`,
        );
      }
    } else {
      throw new ConflictException(
        `Estado fiscal no contemplado para emisión: ${fiscal.estado}.`,
      );
    }

    fiscal = await this.claimFiscalSending(fiscal.id);

    if (fiscal.estado === "autorizado" || fiscal.estado === "rechazado") {
      return this.fiscalResultFromPersisted(
        ambiente,
        fiscal,
        true,
      );
    }

    const cuit = await this.getCommerceCuit(comercioId);
    const { ticket, fromCache } =
      await this.wsaa.getTicketForBackend(
        comercioId,
        ambiente,
        "wsfe",
      );

    const d = prevalidacion.detalle;
    const fechasServicio =
      d.concepto === 2 || d.concepto === 3
        ? [
          `<FchServDesde>${d.fchServDesde}</FchServDesde>`,
          `<FchServHasta>${d.fchServHasta}</FchServHasta>`,
          `<FchVtoPago>${d.fchVtoPago}</FchVtoPago>`,
        ]
        : [];

    const soap = [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
      "<soap:Body>",
      '<FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">',
      "<Auth>",
      `<Token>${this.escapeXml(ticket.token)}</Token>`,
      `<Sign>${this.escapeXml(ticket.sign)}</Sign>`,
      `<Cuit>${cuit}</Cuit>`,
      "</Auth>",
      "<FeCAEReq>",
      "<FeCabReq>",
      "<CantReg>1</CantReg>",
      `<PtoVta>${body.puntoVenta}</PtoVta>`,
      `<CbteTipo>${body.tipoComprobante}</CbteTipo>`,
      "</FeCabReq>",
      "<FeDetReq>",
      "<FECAEDetRequest>",
      `<Concepto>${d.concepto}</Concepto>`,
      `<DocTipo>${d.docTipo}</DocTipo>`,
      `<DocNro>${this.escapeXml(d.docNro)}</DocNro>`,
      `<CbteDesde>${d.cbteDesde}</CbteDesde>`,
      `<CbteHasta>${d.cbteHasta}</CbteHasta>`,
      `<CbteFch>${d.cbteFch}</CbteFch>`,
      `<ImpTotal>${d.impTotal.toFixed(2)}</ImpTotal>`,
      `<ImpTotConc>${d.impTotConc.toFixed(2)}</ImpTotConc>`,
      `<ImpNeto>${d.impNeto.toFixed(2)}</ImpNeto>`,
      `<ImpOpEx>${d.impOpEx.toFixed(2)}</ImpOpEx>`,
      `<ImpTrib>${d.impTrib.toFixed(2)}</ImpTrib>`,
      `<ImpIVA>${d.impIVA.toFixed(2)}</ImpIVA>`,
      ...fechasServicio,
      `<MonId>${d.monId}</MonId>`,
      `<MonCotiz>${d.monCotiz}</MonCotiz>`,
      `<CondicionIVAReceptorId>${d.condicionIvaReceptorId}</CondicionIVAReceptorId>`,
      "</FECAEDetRequest>",
      "</FeDetReq>",
      "</FeCAEReq>",
      "</FECAESolicitar>",
      "</soap:Body>",
      "</soap:Envelope>",
    ].join("");

    let responseText: string;

    try {
      const response = await fetch(
        this.wsfeUrl(ambiente),
        {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            SOAPAction:
              "http://ar.gov.afip.dif.FEV1/FECAESolicitar",
          },
          body: soap,
          signal: AbortSignal.timeout(25_000),
        },
      );

      responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `WSFEv1 respondió HTTP ${response.status} durante FECAESolicitar`,
        );
      }
    } catch (error) {
      await this.persistFiscalUncertain(fiscal.id, error);

      const recuperadoResult = await this.tryRecoverAuthorizedFiscal(
        user,
        comercioId,
        ambiente,
        fiscal.id,
        body.puntoVenta,
        body.tipoComprobante,
        d.cbteDesde,
        fromCache ? "cache" : "wsaa",
      );

      if (recuperadoResult) {
        await this.persistFiscalAuthorized(
          fiscal.id,
          recuperadoResult,
          "incierto",
        );

        return {
          ...recuperadoResult,
          modo: "emision_idempotente",
          comprobanteFiscalId: fiscal.id,
          claveIdempotencia: body.claveIdempotencia,
          reutilizada: persistencia.reutilizada,
          persistido: true,
          estadoPersistido: "autorizado",
          mensaje:
            "La respuesta inicial fue incierta, pero Drito recuperó el comprobante con FECompConsultar y persistió el CAE sin reemitir.",
        };
      }

      throw new ServiceUnavailableException(
        "La comunicación con ARCA quedó en estado incierto. Drito persistió el bloqueo y NO reintentará FECAESolicitar automáticamente; primero debe reconciliarse el comprobante.",
      );
    }

    let parsed: ReturnType<typeof this.parseCaeSolicitar>;

    try {
      parsed = this.parseCaeSolicitar(responseText);
    } catch (error) {
      // Recibimos una respuesta que no pudimos interpretar de forma segura.
      // Como el request ya fue enviado, se trata como incierto y se consulta
      // el comprobante exacto antes de permitir cualquier otro intento.
      await this.persistFiscalUncertain(fiscal.id, error);

      const recuperadoResult = await this.tryRecoverAuthorizedFiscal(
        user,
        comercioId,
        ambiente,
        fiscal.id,
        body.puntoVenta,
        body.tipoComprobante,
        d.cbteDesde,
        fromCache ? "cache" : "wsaa",
      );

      if (recuperadoResult) {
        await this.persistFiscalAuthorized(
          fiscal.id,
          recuperadoResult,
          "incierto",
        );

        return {
          ...recuperadoResult,
          modo: "emision_idempotente",
          comprobanteFiscalId: fiscal.id,
          claveIdempotencia: body.claveIdempotencia,
          reutilizada: persistencia.reutilizada,
          persistido: true,
          estadoPersistido: "autorizado",
          mensaje:
            "Drito no pudo interpretar con certeza la respuesta inicial, pero recuperó el comprobante con FECompConsultar y persistió el CAE sin reemitir.",
        };
      }

      throw new ServiceUnavailableException(
        "ARCA respondió durante FECAESolicitar pero Drito no pudo confirmar de forma segura el resultado. El comprobante quedó incierto y NO se reintentará automáticamente.",
      );
    }

    const cab = parsed.cabecera;
    const det = parsed.detalle;
    if (!cab && parsed.errores.length === 0) {
      const error = new Error(
        "WSFEv1 respondió FECAESolicitar sin cabecera ni errores interpretables",
      );
      await this.persistFiscalUncertain(fiscal.id, error);

      const recuperadoResult = await this.tryRecoverAuthorizedFiscal(
        user,
        comercioId,
        ambiente,
        fiscal.id,
        body.puntoVenta,
        body.tipoComprobante,
        d.cbteDesde,
        fromCache ? "cache" : "wsaa",
      );

      if (recuperadoResult) {
        await this.persistFiscalAuthorized(
          fiscal.id,
          recuperadoResult,
          "incierto",
        );

        return {
          ...recuperadoResult,
          modo: "emision_idempotente",
          comprobanteFiscalId: fiscal.id,
          claveIdempotencia: body.claveIdempotencia,
          reutilizada: persistencia.reutilizada,
          persistido: true,
          estadoPersistido: "autorizado",
          mensaje:
            "La respuesta de ARCA fue incompleta, pero Drito recuperó el comprobante autorizado sin reemitir.",
        };
      }

      throw new ServiceUnavailableException(
        "La respuesta de ARCA fue incompleta y no se pudo confirmar autorización. El comprobante quedó incierto y no se reintentará automáticamente.",
      );
    }

    const cabResultado = cab?.resultado.trim().toUpperCase() ?? "R";
    const detResultado = det?.resultado.trim().toUpperCase() ?? cabResultado;
    const autorizado =
      cabResultado === "A" &&
      detResultado === "A" &&
      Boolean(det?.cae);

    const coreResult: WsfeEmisionCaeCResult = autorizado && det
      ? {
        ok: true,
        ambiente,
        servicio: "wsfev1",
        operacion: "FECAESolicitar",
        ticketOrigen: fromCache ? "cache" : "wsaa",
        estado: "autorizado",
        autorizado: true,
        recuperadoPor: null,
        puntoVenta: cab?.puntoVenta ?? body.puntoVenta,
        tipoComprobante: cab?.tipoComprobante ?? body.tipoComprobante,
        numeroComprobante: det.cbteDesde,
        resultado: det.resultado || cabResultado,
        cae: det.cae,
        caeVencimiento: det.caeFchVto,
        fechaProceso: cab?.fechaProceso ?? "",
        observaciones: det.observaciones,
        errores: parsed.errores,
        eventos: parsed.eventos,
      }
      : {
        ok: true,
        ambiente,
        servicio: "wsfev1",
        operacion: "FECAESolicitar",
        ticketOrigen: fromCache ? "cache" : "wsaa",
        estado: "rechazado",
        autorizado: false,
        recuperadoPor: null,
        puntoVenta: cab?.puntoVenta ?? body.puntoVenta,
        tipoComprobante: cab?.tipoComprobante ?? body.tipoComprobante,
        numeroComprobante: det?.cbteDesde ?? d.cbteDesde,
        resultado: det?.resultado || cabResultado,
        cae: "",
        caeVencimiento: "",
        fechaProceso: cab?.fechaProceso ?? "",
        observaciones: det?.observaciones ?? [],
        errores: parsed.errores,
        eventos: parsed.eventos,
      };

    if (coreResult.autorizado) {
      await this.persistFiscalAuthorized(
        fiscal.id,
        coreResult,
        "enviando",
      );
    } else {
      await this.persistFiscalRejected(
        fiscal.id,
        coreResult,
      );
    }

    return {
      ...coreResult,
      modo: "emision_idempotente",
      comprobanteFiscalId: fiscal.id,
      claveIdempotencia: body.claveIdempotencia,
      reutilizada: persistencia.reutilizada,
      persistido: true,
      estadoPersistido: coreResult.autorizado
        ? "autorizado"
        : "rechazado",
      mensaje: coreResult.autorizado
        ? "CAE autorizado y persistido. Repetir la misma clave devolverá este resultado sin volver a emitir."
        : "ARCA rechazó la solicitud y Drito persistió el rechazo. La misma clave no se reemitirá automáticamente.",
    };
  }


  async emitirCaeC(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    body: PrepararCaeCDto,
  ): Promise<WsfeEmisionCaeCResult> {
    void user;
    void comercioId;
    void ambiente;
    void body;

    throw new ConflictException(
      "La ruta de emisión directa fue reemplazada por emitir-cae-c-idempotente para impedir duplicados y estados fiscales inciertos sin persistencia.",
    );
  }

  async prevalidarCaeC(
    user: AuthUser,
    comercioId: string,
    ambiente: AmbienteArca,
    body: PrepararCaeCDto,
  ): Promise<WsfePrevalidacionCaeCResult> {
    // Reutiliza todas las validaciones locales del preparador.
    // Este método consulta ARCA, pero NO ejecuta FECAESolicitar.
    const preparacion = await this.prepararCaeC(
      user,
      comercioId,
      ambiente,
      body,
    );

    const condiciones =
      await this.getCondicionesIvaReceptor(
        user,
        comercioId,
        ambiente,
        "C",
      );

    const condicion = condiciones.condiciones.find(
      (item) =>
        item.id === body.condicionIvaReceptorId,
    );

    if (!condicion) {
      throw new BadRequestException(
        `La condición de IVA receptor ${body.condicionIvaReceptorId} no está habilitada por ARCA para comprobantes clase C`,
      );
    }

    const puntos = await this.getPuntosVenta(
      user,
      comercioId,
      ambiente,
    );

    const punto = puntos.puntosVenta.find(
      (item) => item.numero === body.puntoVenta,
    );

    if (!punto) {
      throw new ConflictException(
        `El punto de venta ${body.puntoVenta} no está habilitado en ARCA para este CUIT y ambiente. No se solicitó CAE.`,
      );
    }

    if (
      punto.bloqueado.trim().toUpperCase() === "S"
    ) {
      throw new ConflictException(
        `El punto de venta ${body.puntoVenta} figura bloqueado en ARCA. No se solicitó CAE.`,
      );
    }

    if (punto.fechaBaja) {
      throw new ConflictException(
        `El punto de venta ${body.puntoVenta} registra fecha de baja ${punto.fechaBaja}. No se solicitó CAE.`,
      );
    }

    const numeracion = await this.getUltimoAutorizado(
      user,
      comercioId,
      ambiente,
      body.puntoVenta,
      body.tipoComprobante,
    );

    return {
      ok: true,
      ambiente,
      servicio: "wsfev1",
      operacion: "FECAESolicitar",
      modo: "prevalidacion",
      enviaArca: false,
      claseComprobante: "C",
      puntoVenta: {
        numero: punto.numero,
        emisionTipo: punto.emisionTipo,
        bloqueado: punto.bloqueado,
        fechaBaja: punto.fechaBaja,
      },
      condicionIvaReceptor: {
        id: condicion.id,
        descripcion: condicion.descripcion,
      },
      numeracion: {
        fuente: "FECompUltimoAutorizado",
        ultimoComprobante:
          numeracion.ultimoComprobante,
        proximoComprobante:
          numeracion.proximoComprobante,
      },
      detalle: {
        ...preparacion.detalle,
        cbteDesde: numeracion.proximoComprobante,
        cbteHasta: numeracion.proximoComprobante,
      },
      mensaje:
        "Prevalidación completa. FECAESolicitar todavía no fue ejecutado.",
    };
  }

}