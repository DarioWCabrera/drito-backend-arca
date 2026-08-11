import type { AmbienteArca } from "../types/arca.types";

export type WsfeTipoComprobante = {
  id: number;
  descripcion: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
};

export type WsfePuntoVenta = {
  numero: number;
  emisionTipo: string;
  bloqueado: string;
  fechaBaja: string | null;
};

export type WsfeEvento = {
  codigo: number;
  mensaje: string;
};

export type WsfeTiposComprobanteResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FEParamGetTiposCbte";
  ticketOrigen: "wsaa" | "cache";
  cantidad: number;
  tipos: WsfeTipoComprobante[];
  eventos: WsfeEvento[];
};

export type WsfePuntosVentaResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FEParamGetPtosVenta";
  ticketOrigen: "wsaa" | "cache";
  cantidad: number;
  puntosVenta: WsfePuntoVenta[];
  mensaje: string | null;
  eventos: WsfeEvento[];
};

export type WsfeUltimoAutorizadoResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FECompUltimoAutorizado";
  ticketOrigen: "wsaa" | "cache";
  puntoVenta: number;
  tipoComprobante: number;
  ultimoComprobante: number;
  proximoComprobante: number;
  eventos: WsfeEvento[];
};


export type WsfeCondicionIvaReceptor = {
  id: number;
  descripcion: string;
  claseComprobante: string;
};

export type WsfeCondicionesIvaReceptorResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FEParamGetCondicionIvaReceptor";
  ticketOrigen: "wsaa" | "cache";
  claseComprobante: string | null;
  cantidad: number;
  condiciones: WsfeCondicionIvaReceptor[];
  eventos: WsfeEvento[];
};

export type WsfePreparacionCaeCResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FECAESolicitar";
  modo: "preparacion";
  enviaArca: false;
  claseComprobante: "C";
  puntoVenta: number;
  tipoComprobante: number;
  numeracion: {
    fuente: "FECompUltimoAutorizado";
    estado: "pendiente_emision";
  };
  detalle: {
    concepto: number;
    docTipo: number;
    docNro: string;
    condicionIvaReceptorId: number;
    cbteFch: string;
    impTotal: number;
    impTotConc: 0;
    impNeto: number;
    impOpEx: 0;
    impTrib: number;
    impIVA: 0;
    fchServDesde: string | null;
    fchServHasta: string | null;
    fchVtoPago: string | null;
    monId: "PES";
    monCotiz: 1;
  };
};


export type WsfeObservacion = {
  codigo: number;
  mensaje: string;
};

export type WsfeComprobanteConsultadoResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FECompConsultar";
  ticketOrigen: "wsaa" | "cache";
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
  importes: {
    total: number;
    noGravado: number;
    neto: number;
    exento: number;
    tributos: number;
    iva: number;
  };
  moneda: {
    id: string;
    cotizacion: number;
  };
  condicionIvaReceptorId: number | null;
  observaciones: WsfeObservacion[];
  eventos: WsfeEvento[];
};


export type WsfePrevalidacionCaeCResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FECAESolicitar";
  modo: "prevalidacion";
  enviaArca: false;
  claseComprobante: "C";
  puntoVenta: WsfePuntoVenta;
  condicionIvaReceptor: {
    id: number;
    descripcion: string;
  };
  numeracion: {
    fuente: "FECompUltimoAutorizado";
    ultimoComprobante: number;
    proximoComprobante: number;
  };
  detalle: WsfePreparacionCaeCResult["detalle"] & {
    cbteDesde: number;
    cbteHasta: number;
  };
  mensaje: string;
};

export type WsfeEmisionCaeCResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FECAESolicitar";
  ticketOrigen: "wsaa" | "cache";
  estado: "autorizado" | "autorizado_recuperado" | "rechazado";
  autorizado: boolean;
  recuperadoPor: "FECompConsultar" | null;
  puntoVenta: number;
  tipoComprobante: number;
  numeroComprobante: number;
  resultado: string;
  cae: string;
  caeVencimiento: string;
  fechaProceso: string;
  observaciones: WsfeObservacion[];
  errores: Array<{ codigo: number; mensaje: string }>;
  eventos: WsfeEvento[];
};



export type WsfeEstadoPersistido =
  | "borrador"
  | "pendiente_autorizacion"
  | "enviando"
  | "incierto"
  | "autorizado"
  | "rechazado"
  | "error"
  | "descartado";

export type WsfePersistenciaCaeCResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "PERSISTIR_COMPROBANTE_C";
  modo: "persistencia";
  enviaArca: false;
  comprobanteFiscalId: string;
  claveIdempotencia: string;
  solicitudHash: string;
  estado: WsfeEstadoPersistido;
  reutilizada: boolean;
  puntoVenta: number;
  tipoComprobante: number;
  mensaje: string;
};

export type WsfePrevalidacionCaeCIdempotenteResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "PREVALIDAR_EMISION_C_IDEMPOTENTE";
  modo: "prevalidacion_idempotente";
  enviaArca: false;
  comprobanteFiscalId: string;
  claveIdempotencia: string;
  reutilizada: boolean;
  estado: "borrador";
  prevalidacion: WsfePrevalidacionCaeCResult;
  mensaje: string;
};

export type WsfeEmisionCaeCIdempotenteResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: "wsfev1";
  operacion: "FECAESolicitar";
  modo: "emision_idempotente";
  comprobanteFiscalId: string;
  claveIdempotencia: string;
  reutilizada: boolean;
  persistido: true;
  ticketOrigen: "wsaa" | "cache" | null;
  estado: "autorizado" | "autorizado_recuperado" | "rechazado";
  estadoPersistido: "autorizado" | "rechazado";
  autorizado: boolean;
  recuperadoPor: "FECompConsultar" | null;
  puntoVenta: number;
  tipoComprobante: number;
  numeroComprobante: number;
  resultado: string;
  cae: string;
  caeVencimiento: string;
  fechaProceso: string;
  observaciones: WsfeObservacion[];
  errores: Array<{ codigo: number; mensaje: string }>;
  eventos: WsfeEvento[];
  mensaje: string;
};



export type WsfeRepresentacionFiscalItem = {
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje: number;
  descuentoImporte: number;
  subtotal: number;
  total: number;
};

export type WsfeQrFiscal = {
  version: 1;
  json: string;
  base64: string;
  url: string;
};

export type WsfeRepresentacionFiscalResult = {
  ok: true;
  servicio: "wsfev1";
  operacion: "REPRESENTACION_GRAFICA_C";
  comprobanteFiscalId: string;
  estadoPersistido: WsfeEstadoPersistido;
  clase: "C";
  listoParaPdfFiscal: boolean;
  documento: {
    tipoComprobante: number;
    tipoDescripcion: string;
    letra: "C";
    codigoVisual: string;
    puntoVenta: number;
    numeroComprobante: number | null;
    numeroFormateado: string;
    fechaEmision: string;
  };
  emisor: {
    razonSocial: string | null;
    nombreComercial: string | null;
    cuit: string;
    condicionIva: string | null;
    ingresosBrutos: string | null;
    inicioActividades: string | null;
    domicilioFiscal: string | null;
  };
  receptor: {
    nombre: string | null;
    documentoTipoArca: number | null;
    documentoNumero: string | null;
    condicionIvaId: number | null;
    domicilio: string | null;
    email: string | null;
  };
  items: WsfeRepresentacionFiscalItem[];
  importes: {
    total: number;
    neto: number;
    tributos: number;
    iva: number;
    exento: number;
    noGravado: number;
    moneda: string;
    cotizacion: number;
  };
  autorizacion: null | {
    tipo: "CAE" | "CAEA";
    codigo: string;
    vencimiento: string;
  };
  qr: WsfeQrFiscal | null;
  pdf: {
    formato: "A4";
    marcaAgua: "BORRADOR - NO VALIDO COMO COMPROBANTE FISCAL" | null;
    secciones: readonly [
      "encabezado",
      "emisor",
      "receptor",
      "detalle",
      "totales",
      "autorizacion",
      "qr",
    ];
    faltantesParaEmisionGrafica: string[];
  };
  mensaje: string;
};
