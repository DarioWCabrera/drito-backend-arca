import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthUser } from "../common/auth/auth-user.type";
import { SupabaseAdminService } from "../infrastructure/supabase/supabase-admin.service";
import type { DritoAssistantMessageDto } from "./dto/drito-assistant-message.dto";

type RolDrito = "admin" | "vendedor" | "empleado";

type UsuarioComercio = {
  id: string;
  usuario_id: string;
  comercio_id: string;
  rol: RolDrito;
  cargo: string | null;
  activo: boolean;
};

type ComercioAssistant = {
  id: string;
  nombre_comercial: string;
  cuenta_drito_id: string;
};

type CuentaAssistant = {
  id: string;
  nombre: string;
  activo: boolean;
};

type VentaResumen = {
  id: string;
  estado: string;
  estado_pago: string;
  fecha_venta: string;
  total: number | string | null;
  total_pagado: number | string | null;
};

type ResumenVentasMes = {
  ok: true;
  soloLectura: true;
  herramienta: "ventas.resumen_mes";
  comercioId: string;
  periodo: {
    etiqueta: string;
    desde: string;
    hastaExclusivo: string;
  };
  metricas: {
    cantidadVentas: number;
    totalVendido: number;
    totalCobrado: number;
    saldoPendiente: number;
    ventasPendientes: number;
    ventasPagadas: number;
  };
};


type ClienteVentaRelacion = {
  nombre?: string | null;
  razon_social?: string | null;
  activo?: boolean | null;
};

type VentaCuentaCliente = {
  cliente_id: string | null;
  total: number | string | null;
  total_pagado: number | string | null;
  estado_pago: string;
  cliente:
  | ClienteVentaRelacion
  | ClienteVentaRelacion[]
  | null;
};

type ClienteConDeuda = {
  clienteId: string;
  nombre: string;
  activo: boolean;
  totalVentas: number;
  totalCobrado: number;
  saldoPendiente: number;
  ventasPendientes: number;
};

type ResumenClientesConDeuda = {
  ok: true;
  soloLectura: true;
  herramienta: "cuentas_clientes.deudores";
  comercioId: string;
  metricas: {
    clientesConDeuda: number;
    saldoTotalPendiente: number;
  };
  clientes: ClienteConDeuda[];
};


type MovimientoCajaAssistant = {
  id: string;
  tipo: "ingreso" | "egreso";
  fecha: string;
  importe: number | string | null;
  concepto: string;
  medio_pago: string | null;
  origen: string | null;
  estado: string;
  created_at: string;
};

type EgresoCajaDestacado = {
  id: string;
  fecha: string;
  importe: number;
  concepto: string;
  medioPago: string | null;
  origen: string | null;
};

type ResumenCajaMes = {
  ok: true;
  soloLectura: true;
  herramienta: "caja.resumen_mes";
  comercioId: string;
  periodo: {
    etiqueta: string;
    desde: string;
    hasta: string;
  };
  metricas: {
    totalIngresos: number;
    totalEgresos: number;
    saldoPeriodo: number;
    movimientosRegistrados: number;
    cantidadIngresos: number;
    cantidadEgresos: number;
  };
  mayoresEgresos: EgresoCajaDestacado[];
};



type CompraCuentaProveedorPulso = {
  proveedor_id: string | null;
  total: number | string | null;
  total_pagado: number | string | null;
  fecha_vencimiento: string | null;
  estado: string;
  proveedor:
  | {
    nombre?: string | null;
    razon_social?: string | null;
    activo?: boolean | null;
  }
  | Array<{
    nombre?: string | null;
    razon_social?: string | null;
    activo?: boolean | null;
  }>
  | null;
};

type ProveedorConDeudaPulso = {
  proveedorId: string;
  nombre: string;
  saldoPendiente: number;
  comprasPendientes: number;
  comprasVencidas: number;
  importeVencido: number;
};

type ResumenProveedoresPulso = {
  saldoTotalPendiente: number;
  comprasPendientes: number;
  comprasVencidas: number;
  importeVencido: number;
  proveedores: ProveedorConDeudaPulso[];
};

type ProductoStockPulso = {
  id: string;
  codigo: string | null;
  nombre: string;
  stock_actual: number | string | null;
  stock_minimo: number | string | null;
  controla_stock: boolean;
  activo: boolean;
  tipo: string;
};

type ProductoAlertaStockPulso = {
  id: string;
  codigo: string | null;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  situacion: "sin_stock" | "stock_bajo";
};

type ResumenStockPulso = {
  productosControlados: number;
  sinStock: number;
  stockBajo: number;
  alertas: ProductoAlertaStockPulso[];
};

type NivelPulsoDrito =
  | "critico"
  | "atencion"
  | "informativo";

type AlertaPulsoDrito = {
  codigo:
  | "caja_negativa"
  | "proveedores_vencidos"
  | "sin_stock"
  | "stock_bajo"
  | "clientes_por_cobrar"
  | "proveedores_por_pagar";
  nivel: NivelPulsoDrito;
  titulo: string;
  detalle: string;
  importe: number | null;
  cantidad: number | null;
  path: string;
  prioridad: number;
};

type PulsoNegocioDrito = {
  ok: true;
  soloLectura: true;
  herramienta: "negocio.pulso_hoy";
  comercioId: string;
  fecha: string;
  fuentesDisponibles: string[];
  fuentesOmitidas: string[];
  ventas: ResumenVentasMes | null;
  clientes: ResumenClientesConDeuda | null;
  caja: ResumenCajaMes | null;
  proveedores: ResumenProveedoresPulso | null;
  stock: ResumenStockPulso | null;
  alertas: AlertaPulsoDrito[];
};


type DireccionComparativaDrito =
  | "sube"
  | "baja"
  | "igual"
  | "sin_base";

type ComparacionNumeroDrito = {
  actual: number;
  anterior: number;
  diferencia: number;
  variacionPorcentaje: number | null;
  direccion: DireccionComparativaDrito;
};

type ResumenPeriodoVentasTendencia = {
  cantidadVentas: number;
  totalVendido: number;
  ticketPromedio: number;
};

type ResumenPeriodoCobrosTendencia = {
  cantidadCobros: number;
  totalCobrado: number;
};

type ResumenPeriodoGastosTendencia = {
  cantidadGastos: number;
  totalGastos: number;
};

type ResumenPeriodoCajaTendencia = {
  ingresos: number;
  egresos: number;
  saldo: number;
  movimientos: number;
};

type TendenciaNegocioDrito = {
  ok: true;
  soloLectura: true;
  herramienta: "negocio.tendencia_mes";
  comercioId: string;
  criterio: "mes_a_fecha_vs_mismo_tramo_mes_anterior";
  periodoActual: {
    etiqueta: string;
    desde: string;
    hasta: string;
    diasComparados: number;
  };
  periodoAnterior: {
    etiqueta: string;
    desde: string;
    hasta: string;
    diasComparados: number;
  };
  fuentesDisponibles: string[];
  fuentesOmitidas: string[];
  ventas: {
    actual: ResumenPeriodoVentasTendencia;
    anterior: ResumenPeriodoVentasTendencia;
    totalVendido: ComparacionNumeroDrito;
    cantidadVentas: ComparacionNumeroDrito;
    ticketPromedio: ComparacionNumeroDrito;
  } | null;
  cobros: {
    actual: ResumenPeriodoCobrosTendencia;
    anterior: ResumenPeriodoCobrosTendencia;
    totalCobrado: ComparacionNumeroDrito;
    cantidadCobros: ComparacionNumeroDrito;
  } | null;
  gastos: {
    actual: ResumenPeriodoGastosTendencia;
    anterior: ResumenPeriodoGastosTendencia;
    totalGastos: ComparacionNumeroDrito;
    cantidadGastos: ComparacionNumeroDrito;
  } | null;
  caja: {
    actual: ResumenPeriodoCajaTendencia;
    anterior: ResumenPeriodoCajaTendencia;
    ingresos: ComparacionNumeroDrito;
    egresos: ComparacionNumeroDrito;
    saldo: ComparacionNumeroDrito;
  } | null;
};


type SeveridadHallazgoDrito =
  | "critico"
  | "atencion"
  | "positivo"
  | "informativo";

type HallazgoNegocioDrito = {
  codigo:
  | "caja_pasa_negativa"
  | "ingresos_caja_caen_fuerte"
  | "egresos_caja_suben_fuerte"
  | "ventas_caen_fuerte"
  | "ventas_nuevo_impulso"
  | "cobros_caen_fuerte"
  | "cobros_nuevo_impulso"
  | "cobros_rezagados_vs_ventas"
  | "gastos_suben_fuerte"
  | "ticket_cambia_fuerte"
  | "proveedores_vencidos"
  | "sin_stock"
  | "stock_bajo";
  severidad: SeveridadHallazgoDrito;
  titulo: string;
  detalle: string;
  evidencia: string;
  path: string;
  prioridad: number;
};

type AnalisisHallazgosDrito = {
  ok: true;
  soloLectura: true;
  herramienta: "negocio.hallazgos_relevantes";
  comercioId: string;
  criterio:
  "reglas_transparentes_sobre_periodos_comparables_y_estado_actual";
  periodoActual: TendenciaNegocioDrito["periodoActual"];
  periodoAnterior: TendenciaNegocioDrito["periodoAnterior"];
  hallazgos: HallazgoNegocioDrito[];
  fuentesDisponibles: string[];
  fuentesOmitidas: string[];
};


type NivelPrioridadOperativaDrito =
  | "urgente"
  | "atencion"
  | "seguimiento";

type PrioridadOperativaDrito = {
  codigo:
  | "caja_negativa"
  | "proveedores_vencidos"
  | "sin_stock"
  | "clientes_por_cobrar"
  | "stock_bajo"
  | "proveedores_por_pagar";
  nivel: NivelPrioridadOperativaDrito;
  orden: number;
  titulo: string;
  motivo: string;
  evidencia: string;
  path: string;
};

type BandejaPrioridadesDrito = {
  ok: true;
  soloLectura: true;
  herramienta: "negocio.prioridades_operativas";
  comercioId: string;
  fecha: string;
  criterio:
  "urgencia_operativa_verificable_sin_asesoria_estrategica";
  prioridades: PrioridadOperativaDrito[];
  fuentesDisponibles: string[];
  fuentesOmitidas: string[];
};


type EstadoTemporalVencimientoDrito =
  | "vencido"
  | "vence_hoy"
  | "proximo";

type OrigenVencimientoDrito =
  | "cobro_cliente"
  | "pago_proveedor";

type VencimientoAgendaDrito = {
  id: string;
  origen: OrigenVencimientoDrito;
  estadoTemporal: EstadoTemporalVencimientoDrito;
  fechaVencimiento: string;
  diasRespectoHoy: number;
  saldoPendiente: number;
  contraparteId: string;
  contraparteNombre: string;
  documentoInterno: string;
  documentoExterno: string | null;
  telefono: string | null;
  path: string;
};

type AgendaVencimientosDrito = {
  ok: true;
  soloLectura: true;
  herramienta: "negocio.agenda_vencimientos";
  comercioId: string;
  fecha: string;
  ventanaDias: 7;
  vencidos: VencimientoAgendaDrito[];
  vencenHoy: VencimientoAgendaDrito[];
  proximos: VencimientoAgendaDrito[];
  clientesConSaldoSinFecha: number;
  proveedoresConSaldoSinFecha: number;
  fuentesDisponibles: string[];
  fuentesOmitidas: string[];
};

type BriefingOperativoDrito = {
  ok: true;
  soloLectura: true;
  herramienta: "negocio.briefing_operativo";
  comercioId: string;
  fecha: string;
  criterio:
  "estado_actual_mas_vencimientos_y_comparacion_temporal_sin_inferir_causas";
  agenda: AgendaVencimientosDrito;
  pulso: PulsoNegocioDrito;
  tendencia: TendenciaNegocioDrito;
  fuentesDisponibles: string[];
  fuentesOmitidas: string[];
};


type VentaAgendaRow = {
  id: string;
  numero: number | string;
  cliente_id: string | null;
  total: number | string | null;
  total_pagado: number | string | null;
  estado: string;
  estado_pago: string;
  cliente:
  | {
    nombre?: string | null;
    razon_social?: string | null;
    telefono?: string | null;
    email?: string | null;
    activo?: boolean | null;
  }
  | Array<{
    nombre?: string | null;
    razon_social?: string | null;
    telefono?: string | null;
    email?: string | null;
    activo?: boolean | null;
  }>
  | null;
};

type FiscalAgendaRow = {
  venta_id: string | null;
  cliente_id: string | null;
  fecha_vencimiento_pago: string | null;
  estado: string;
  tipo_comprobante_arca: number | string | null;
  punto_venta_numero: number | string | null;
  numero_comprobante: number | string | null;
};

type CompraAgendaRow = {
  id: string;
  numero: number | string;
  proveedor_id: string | null;
  total: number | string | null;
  total_pagado: number | string | null;
  fecha_vencimiento: string | null;
  estado: string;
  proveedor:
  | {
    nombre?: string | null;
    razon_social?: string | null;
    activo?: boolean | null;
  }
  | Array<{
    nombre?: string | null;
    razon_social?: string | null;
    activo?: boolean | null;
  }>
  | null;
};

type DritoAssistantGuideFlow =
  | "venta"
  | "stock_ingreso";

type ClientePreparacionVenta = {
  id: string;
  nombre: string;
  razon_social: string | null;
  tipo_documento: string | null;
  documento: string | null;
};

type ProductoPreparacionVenta = {
  id: string;
  tipo: "producto" | "servicio";
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  unidad_medida: string;
  precio_venta: number | string | null;
  iva_porcentaje: number | string | null;
  controla_stock: boolean;
  stock_actual: number | string | null;
};

type VentaPreparadaDrito = {
  fechaVenta: string;

  clienteId: string;
  clienteNombre: string;
  productoId: string;
  productoNombre: string;
  productoCodigo: string | null;
  cantidad: number;
  precioUnitario: number;
  ivaPorcentaje: number;
  controlaStock: boolean;
  stockActual: number | null;
  stockPosteriorEstimado: number | null;
  subtotalEstimado: number;
  ivaEstimado: number;
  totalEstimado: number;
};


type VentaPreparacionCobro = {
  id: string;
  numero: number | string;
  cliente_id: string | null;
  total: number | string | null;
  total_pagado: number | string | null;
  estado: string;
  estado_pago: string;
  cliente:
  | ClienteVentaRelacion
  | ClienteVentaRelacion[]
  | null;
};

type CobroPreparadoDrito = {
  fechaPago: string;

  ventaId: string;
  numeroVenta: number;
  clienteNombre: string;

  importe: number;
  medioPago:
  | "efectivo"
  | "transferencia"
  | "tarjeta_debito"
  | "tarjeta_credito"
  | "billetera_virtual"
  | "cheque"
  | "deposito"
  | "otro";
  medioPagoLabel: string;

  referencia: string | null;
  observaciones: string | null;

  totalVenta: number;
  saldoAntes: number;
  saldoDespuesEstimado: number;
  estadoPagoEstimado: "pendiente" | "parcial" | "pagada";
};


type StockPreparadoDrito = {
  productoId: string;
  productoNombre: string;
  productoCodigo: string | null;
  unidadMedida: string;

  tipo: "entrada";
  cantidad: number;
  motivo: string;

  stockAntes: number;
  stockDespuesEstimado: number;
};


type StockSalidaPreparadoDrito = {
  productoId: string;
  productoNombre: string;
  productoCodigo: string | null;
  unidadMedida: string;

  tipo: "salida";
  cantidad: number;
  motivo: string;

  stockAntes: number;
  stockDespuesEstimado: number;
};


type StockAjustePreparadoDrito = {
  productoId: string;
  productoNombre: string;
  productoCodigo: string | null;
  unidadMedida: string;

  stockAntes: number;
  stockObjetivo: number;
  diferencia: number;

  tipoMovimiento:
  | "ajuste_positivo"
  | "ajuste_negativo";
  cantidadMovimiento: number;

  motivo: string;
};

type CategoriaGastoPreparacion = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

type GastoPreparadoDrito = {
  categoriaId: string;
  categoriaNombre: string;
  fechaGasto: string;
  concepto: string;
  importe: number;
  medioPago:
  | "efectivo"
  | "transferencia"
  | "tarjeta_debito"
  | "tarjeta_credito"
  | "mercado_pago"
  | "cheque"
  | "otro";
  medioPagoLabel: string;
  beneficiario: string | null;
  referencia: string | null;
  observaciones: string | null;
};


type ProveedorPagoPreparacion = {
  id: string;
  nombre: string | null;
  razon_social: string | null;
  documento: string | null;
  activo: boolean;
};

type PagoProveedorPreparadoDrito = {
  proveedorId: string;
  proveedorNombre: string;
  proveedorDocumento: string | null;

  fechaPago: string;
  importe: number;

  medioPago:
  | "efectivo"
  | "transferencia"
  | "tarjeta_debito"
  | "tarjeta_credito"
  | "cheque"
  | "mercado_pago"
  | "otro";
  medioPagoLabel: string;

  saldoAntes: number;
  saldoDespuesEstimado: number;

  referencia: string | null;
  observaciones: string | null;
};


type ProveedorCompraPreparacionDrito = {
  id: string;
  nombre: string | null;
  razon_social: string | null;
  documento: string | null;
  plazo_pago_dias: number | string | null;
  activo: boolean;
};

type ArticuloCompraPreparacionDrito = {
  id: string;
  tipo: "producto" | "servicio";
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  unidad_medida: string;
  costo: number | string | null;
  iva_porcentaje: number | string | null;
  controla_stock: boolean;
  stock_actual: number | string | null;
  activo: boolean;
};

type CompraPreparadaDrito = {
  proveedorId: string;
  proveedorNombre: string;
  proveedorDocumento: string | null;

  productoId: string;
  productoNombre: string;
  productoCodigo: string | null;
  unidadMedida: string;

  fechaCompra: string;
  fechaVencimiento: string | null;

  tipoComprobante:
  | "factura"
  | "remito"
  | "ticket"
  | "recibo"
  | "otro";
  numeroComprobante: string | null;
  moneda: "ARS";

  cantidad: number;
  costoUnitario: number;
  descuentoPorcentaje: 0;
  descuentoGeneralPorcentaje: 0;

  ivaTratamiento:
  | "computable"
  | "no_computable"
  | "exento"
  | "no_gravado";
  ivaTratamientoLabel: string;
  ivaPorcentaje: number;
  ivaAlicuotaCodigo: number | null;

  subtotalEstimado: number;
  ivaEstimado: number;
  totalEstimado: number;

  actualizarCostos: true;
  costoAnterior: number;
  costoPosteriorEstimado: number;

  controlaStock: boolean;
  stockAntes: number | null;
  stockDespuesEstimado: number | null;

  saldoProveedorAntes: number;
  saldoProveedorDespuesEstimado: number;

  percepcionesIncluidas: false;
  pagoInicialIncluido: false;
};

type DritoAssistantNavigateAction = {
  id: string;
  tipo: "navegar";
  label: string;
  path: string;
  guia?: DritoAssistantGuideFlow;
};

type DritoAssistantWhatsAppAction = {
  id: string;
  tipo: "abrir_whatsapp";
  label: string;
  url: string;
};


type DritoAssistantPrepareSaleAction = {
  id: string;
  tipo: "preparar_venta";
  label: string;
  path: string;
  borrador: VentaPreparadaDrito;
};

type DritoAssistantConfirmSaleAction = {
  id: string;
  tipo: "confirmar_venta";
  label: string;
  accionId: string;
  expiresAt: string;
  resumen: VentaPreparadaDrito;
};

type DritoAssistantConfirmPaymentAction = {
  id: string;
  tipo: "confirmar_cobro";
  label: string;
  accionId: string;
  expiresAt: string;
  resumen: CobroPreparadoDrito;
};

type DritoAssistantConfirmStockAction = {
  id: string;
  tipo: "confirmar_stock_ingreso";
  label: string;
  accionId: string;
  expiresAt: string;
  resumen: StockPreparadoDrito;
};

type DritoAssistantConfirmStockExitAction = {
  id: string;
  tipo: "confirmar_stock_salida";
  label: string;
  accionId: string;
  expiresAt: string;
  resumen: StockSalidaPreparadoDrito;
};

type DritoAssistantConfirmStockAdjustAction = {
  id: string;
  tipo: "confirmar_stock_ajuste";
  label: string;
  accionId: string;
  expiresAt: string;
  resumen: StockAjustePreparadoDrito;
};

type DritoAssistantConfirmExpenseAction = {
  id: string;
  tipo: "confirmar_gasto";
  label: string;
  accionId: string;
  expiresAt: string;
  resumen: GastoPreparadoDrito;
};

type DritoAssistantConfirmSupplierPaymentAction = {
  id: string;
  tipo: "confirmar_pago_proveedor";
  label: string;
  accionId: string;
  expiresAt: string;
  resumen: PagoProveedorPreparadoDrito;
};

type DritoAssistantConfirmPurchaseAction = {
  id: string;
  tipo: "confirmar_compra";
  label: string;
  accionId: string;
  expiresAt: string;
  resumen: CompraPreparadaDrito;
};

type DritoAssistantAction =
  | DritoAssistantNavigateAction
  | DritoAssistantWhatsAppAction
  | DritoAssistantPrepareSaleAction
  | DritoAssistantConfirmSaleAction
  | DritoAssistantConfirmPaymentAction
  | DritoAssistantConfirmStockAction
  | DritoAssistantConfirmStockExitAction
  | DritoAssistantConfirmStockAdjustAction
  | DritoAssistantConfirmExpenseAction
  | DritoAssistantConfirmSupplierPaymentAction
  | DritoAssistantConfirmPurchaseAction;

type AccionDritoPersistida = {
  id: string;
  usuario_id: string;
  comercio_id: string;
  tipo:
  | "crear_venta"
  | "registrar_pago_venta"
  | "registrar_stock"
  | "registrar_stock_salida"
  | "ajustar_stock_objetivo"
  | "registrar_gasto_general"
  | "registrar_pago_proveedor"
  | "crear_compra";
  estado: "pendiente" | "ejecutada" | "cancelada";
  payload:
  | VentaPreparadaDrito
  | CobroPreparadoDrito
  | StockPreparadoDrito
  | StockSalidaPreparadoDrito
  | StockAjustePreparadoDrito
  | GastoPreparadoDrito
  | PagoProveedorPreparadoDrito
  | CompraPreparadaDrito;
  resultado: Record<string, unknown> | null;
  expires_at: string;
};

type ResultadoConfirmarVentaDrito = {
  accion_id: string;
  venta_id: string;
  numero_venta: number | string;
  total_venta: number | string;
  total_pagado: number | string;
  saldo_pendiente: number | string;
  estado_pago: string;
  pago_id: string | null;
  numero_pago: number | string | null;
  movimientos_generados: number | string;
  stock_posterior: number | string | null;
  idempotente: boolean;
};


type ResultadoConfirmarCobroDrito = {
  accion_id: string;
  pago_id: string;
  numero_pago: number | string;
  venta_id: string;
  numero_venta: number | string;
  importe: number | string;
  total_pagado: number | string;
  saldo_pendiente: number | string;
  estado_pago: string;
  movimiento_caja_id: string | null;
  idempotente: boolean;
};


type ResultadoConfirmarStockDrito = {
  accion_id: string;
  movimiento_id: string | null;
  producto_id: string;
  producto_nombre: string;
  tipo_movimiento: string;
  cantidad: number | string;
  stock_anterior: number | string;
  stock_posterior: number | string;
  motivo: string;
  idempotente: boolean;
};


type ResultadoConfirmarStockSalidaDrito = ResultadoConfirmarStockDrito;


type ResultadoConfirmarStockAjusteDrito = {
  accion_id: string;
  movimiento_id: string | null;
  producto_id: string;
  producto_nombre: string;
  tipo_movimiento: string;
  cantidad: number | string;
  diferencia: number | string;
  stock_anterior: number | string;
  stock_objetivo: number | string;
  stock_posterior: number | string;
  motivo: string;
  idempotente: boolean;
};



type ResultadoConfirmarGastoDrito = {
  accion_id: string;
  gasto_id: string;
  numero: number | string;
  comprobante: string;
  fecha_gasto: string;
  categoria_id: string;
  categoria_nombre: string;
  concepto: string;
  beneficiario: string | null;
  importe: number | string;
  medio_pago: string;
  referencia: string | null;
  observaciones: string | null;
  estado: string;
  movimiento_caja_id: string;
  idempotente: boolean;
};

type ResultadoConfirmarPagoProveedorDrito = {
  accion_id: string;
  pago_proveedor_id: string;
  numero_pago_proveedor: number | string;
  comprobante: string;
  proveedor_id: string;
  nombre_proveedor: string;
  importe_pagado: number | string;
  compras_afectadas: number | string;
  pagos_generados: number | string;
  saldo_anterior: number | string;
  saldo_final: number | string;
  movimiento_caja_id: string;
  idempotente: boolean;
};

type ResultadoConfirmarCompraDrito = {
  accion_id: string;
  compra_id: string;
  numero_compra: number | string;
  proveedor_id: string;
  proveedor_nombre: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number | string;
  costo_unitario: number | string;
  iva_tratamiento: string;
  iva_porcentaje: number | string;
  iva_alicuota_codigo: number | string | null;
  total_comercial: number | string;
  total_compra: number | string;
  movimientos_generados: number | string;
  cantidad_total_ingresada: number | string;
  stock_anterior: number | string | null;
  stock_posterior: number | string | null;
  saldo_proveedor_anterior: number | string;
  saldo_proveedor_final: number | string;
  idempotente: boolean;
};

@Injectable()
export class DritoAssistantService {
  constructor(
    private readonly supabase: SupabaseAdminService,
    private readonly config: ConfigService,
  ) { }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[¿?¡!.,;:()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private formatearMedioPagoGasto(
    valor: string,
  ): string {
    const etiquetas: Record<
      string,
      string
    > = {
      efectivo: "Efectivo",
      transferencia: "Transferencia",
      tarjeta_debito: "Tarjeta de débito",
      tarjeta_credito: "Tarjeta de crédito",
      mercado_pago: "Mercado Pago",
      cheque: "Cheque",
      otro: "Otro",
    };

    return (
      etiquetas[valor] ??
      valor.replaceAll(
        "_",
        " ",
      )
    );
  }

  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(valor);
  }

  private fechaActualArgentina(): string {
    const partes = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(new Date());

    const year =
      partes.find(
        (parte) =>
          parte.type === "year",
      )?.value ?? "";

    const month =
      partes.find(
        (parte) =>
          parte.type === "month",
      )?.value ?? "";

    const day =
      partes.find(
        (parte) =>
          parte.type === "day",
      )?.value ?? "";

    if (!year || !month || !day) {
      throw new Error(
        "No se pudo resolver la fecha local de Argentina.",
      );
    }

    return `${year}-${month}-${day}`;
  }

  private plural(
    cantidad: number,
    singular: string,
    plural: string,
  ): string {
    return cantidad === 1 ? singular : plural;
  }

  private tokenizarBusqueda(
    texto: string,
  ): string[] {
    const stopwords = new Set([
      "a",
      "al",
      "de",
      "del",
      "el",
      "la",
      "las",
      "los",
      "para",
      "por",
      "una",
      "un",
      "unos",
      "unas",
    ]);

    return this.normalizarTexto(texto)
      .split(" ")
      .filter(Boolean)
      .filter(
        (token) =>
          !stopwords.has(token),
      )
      .map((token) => {
        if (
          token.length > 4 &&
          token.endsWith("es")
        ) {
          return token.slice(0, -2);
        }

        if (
          token.length > 3 &&
          token.endsWith("s")
        ) {
          return token.slice(0, -1);
        }

        return token;
      });
  }

  private puntuarCoincidencia(
    consulta: string,
    valores: Array<
      string | null | undefined
    >,
  ): number {
    const consultaNormalizada =
      this.normalizarTexto(consulta);

    const universo =
      this.normalizarTexto(
        valores
          .filter(Boolean)
          .join(" "),
      );

    if (
      !consultaNormalizada ||
      !universo
    ) {
      return 0;
    }

    if (
      universo === consultaNormalizada
    ) {
      return 1000;
    }

    if (
      universo.includes(
        consultaNormalizada,
      )
    ) {
      return 500;
    }

    const tokensConsulta =
      this.tokenizarBusqueda(
        consultaNormalizada,
      );

    const tokensUniverso =
      new Set(
        this.tokenizarBusqueda(
          universo,
        ),
      );

    if (
      tokensConsulta.length === 0
    ) {
      return 0;
    }

    const coincidencias =
      tokensConsulta.filter(
        (token) =>
          [...tokensUniverso].some(
            (candidato) =>
              candidato === token ||
              candidato.includes(
                token,
              ) ||
              token.includes(
                candidato,
              ),
          ),
      ).length;

    if (coincidencias === 0) {
      return 0;
    }

    return (
      coincidencias * 100 -
      (
        tokensConsulta.length -
        coincidencias
      ) * 25
    );
  }

  private elegirCoincidenciaUnica<T>(
    consulta: string,
    candidatos: T[],
    obtenerValores: (
      candidato: T,
    ) => Array<
      string | null | undefined
    >,
  ):
    | {
      estado: "ok";
      valor: T;
    }
    | {
      estado: "no_encontrado";
    }
    | {
      estado: "ambiguo";
      candidatos: T[];
    } {
    const puntuados =
      candidatos
        .map((candidato) => ({
          candidato,
          puntaje:
            this.puntuarCoincidencia(
              consulta,
              obtenerValores(
                candidato,
              ),
            ),
        }))
        .filter(
          (item) =>
            item.puntaje > 0,
        )
        .sort(
          (a, b) =>
            b.puntaje -
            a.puntaje,
        );

    if (puntuados.length === 0) {
      return {
        estado: "no_encontrado",
      };
    }

    const mejor = puntuados[0];

    const empatados =
      puntuados.filter(
        (item) =>
          item.puntaje ===
          mejor.puntaje,
      );

    if (empatados.length > 1) {
      return {
        estado: "ambiguo",
        candidatos:
          empatados
            .slice(0, 3)
            .map(
              (item) =>
                item.candidato,
            ),
      };
    }

    return {
      estado: "ok",
      valor: mejor.candidato,
    };
  }

  private extraerPedidoVenta(
    mensaje: string,
  ):
    | {
      cantidad: number;
      producto: string;
      cliente: string;
    }
    | null {
    const limpio = mensaje
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase()
      .replace(/[¿?¡!]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const patrones = [
      /(?:preparame|prepara|armame|arma|creame|crea|registrame|registra|haceme|hace)\s+(?:una\s+)?venta\s+de\s+(\d+(?:[.,]\d+)?)\s+(.+?)\s+(?:para|a)\s+(.+)$/,
      /(?:preparame|prepara|armame|arma)\s+(\d+(?:[.,]\d+)?)\s+(.+?)\s+(?:para|a)\s+(.+)$/,
      /(?:vende|vendeme|vendele)\s+(\d+(?:[.,]\d+)?)\s+(.+?)\s+(?:para|a)\s+(.+)$/,
    ];

    for (const patron of patrones) {
      const match =
        limpio.match(patron);

      if (!match) {
        continue;
      }

      const cantidad =
        Number(
          match[1].replace(
            ",",
            ".",
          ),
        );

      const producto =
        match[2].trim();

      const cliente =
        match[3].trim();

      if (
        Number.isFinite(cantidad) &&
        cantidad > 0 &&
        producto &&
        cliente
      ) {
        return {
          cantidad,
          producto,
          cliente,
        };
      }
    }

    return null;
  }

  private nombreClientePreparacion(
    cliente: ClientePreparacionVenta,
  ): string {
    return (
      cliente.razon_social?.trim() ||
      cliente.nombre?.trim() ||
      "Cliente sin nombre"
    );
  }

  private async prepararVentaDesdeMensaje(
    comercioId: string,
    vinculacion: UsuarioComercio,
    mensaje: string,
    modo: "borrador" | "ejecucion" = "borrador",
  ) {
    await this.exigirPermiso(
      vinculacion,
      "ventas.crear",
    );

    const pedido =
      this.extraerPedidoVenta(
        mensaje,
      );

    if (!pedido) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.preparar_incompleta",
        respuesta:
          "Puedo prepararte la venta, pero necesito cantidad, producto y cliente. Probá, por ejemplo: “Preparame una venta de 2 cascos de seguridad para Tecnoforza”.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const [
      clientesResultado,
      productosResultado,
    ] = await Promise.all([
      this.supabase.client
        .from("clientes")
        .select(
          "id, nombre, razon_social, tipo_documento, documento",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq("activo", true)
        .limit(500),

      this.supabase.client
        .from("productos")
        .select(
          "id, tipo, codigo, nombre, descripcion, unidad_medida, precio_venta, iva_porcentaje, controla_stock, stock_actual",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq("activo", true)
        .limit(500),
    ]);

    if (clientesResultado.error) {
      throw clientesResultado.error;
    }

    if (productosResultado.error) {
      throw productosResultado.error;
    }

    const clientes =
      (clientesResultado.data ??
        []) as ClientePreparacionVenta[];

    const productos =
      (productosResultado.data ??
        []) as ProductoPreparacionVenta[];

    const clienteElegido =
      this.elegirCoincidenciaUnica(
        pedido.cliente,
        clientes,
        (cliente) => [
          cliente.razon_social,
          cliente.nombre,
          cliente.documento,
        ],
      );

    if (
      clienteElegido.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.preparar_cliente_no_encontrado",
        respuesta:
          `No encontré un cliente activo que coincida con “${pedido.cliente}” en esta empresa. No voy a adivinar cuál usar.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      clienteElegido.estado ===
      "ambiguo"
    ) {
      const nombres =
        clienteElegido.candidatos
          .map(
            (cliente) =>
              this.nombreClientePreparacion(
                cliente,
              ),
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.preparar_cliente_ambiguo",
        respuesta:
          `Encontré más de un cliente posible para “${pedido.cliente}”: ${nombres}. Decime cuál querés usar.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const productoElegido =
      this.elegirCoincidenciaUnica(
        pedido.producto,
        productos,
        (producto) => [
          producto.nombre,
          producto.codigo,
          producto.descripcion,
        ],
      );

    if (
      productoElegido.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.preparar_producto_no_encontrado",
        respuesta:
          `No encontré un producto o servicio activo que coincida con “${pedido.producto}” en esta empresa. No voy a inventar un artículo.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      productoElegido.estado ===
      "ambiguo"
    ) {
      const nombres =
        productoElegido.candidatos
          .map(
            (producto) =>
              producto.codigo
                ? `${producto.nombre} (${producto.codigo})`
                : producto.nombre,
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.preparar_producto_ambiguo",
        respuesta:
          `Encontré más de un artículo posible para “${pedido.producto}”: ${nombres}. Decime cuál querés usar.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const cliente =
      clienteElegido.valor;

    const producto =
      productoElegido.valor;

    const cantidad =
      Number(pedido.cantidad);

    const precioUnitario =
      Number(
        producto.precio_venta ?? 0,
      );

    const ivaPorcentaje =
      Number(
        producto.iva_porcentaje ?? 0,
      );

    const controlaStock =
      Boolean(
        producto.controla_stock,
      );

    const stockActual =
      controlaStock
        ? Number(
          producto.stock_actual ?? 0,
        )
        : null;

    if (
      controlaStock &&
      stockActual !== null &&
      cantidad > stockActual
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.preparar_stock_insuficiente",
        respuesta:
          `Encontré ${producto.nombre}, pero pediste ${cantidad} y el stock actual es ${stockActual}. No voy a preparar una venta que dejaría el stock en negativo.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const subtotalEstimado =
      Math.round(
        cantidad *
        precioUnitario *
        100,
      ) / 100;

    const ivaEstimado =
      Math.round(
        subtotalEstimado *
        (
          ivaPorcentaje /
          100
        ) *
        100,
      ) / 100;

    const totalEstimado =
      Math.round(
        (
          subtotalEstimado +
          ivaEstimado
        ) *
        100,
      ) / 100;

    const stockPosteriorEstimado =
      controlaStock &&
        stockActual !== null
        ? Math.round(
          (
            stockActual -
            cantidad
          ) *
          1000,
        ) / 1000
        : null;

    const borrador: VentaPreparadaDrito =
    {
      fechaVenta:
        this.fechaActualArgentina(),

      clienteId: cliente.id,
      clienteNombre:
        this.nombreClientePreparacion(
          cliente,
        ),

      productoId:
        producto.id,
      productoNombre:
        producto.nombre,
      productoCodigo:
        producto.codigo,

      cantidad,
      precioUnitario,
      ivaPorcentaje,

      controlaStock,
      stockActual,
      stockPosteriorEstimado,

      subtotalEstimado,
      ivaEstimado,
      totalEstimado,
    };

    const stockTexto =
      controlaStock &&
        stockActual !== null &&
        stockPosteriorEstimado !== null
        ? ` Stock: ${stockActual} → ${stockPosteriorEstimado}.`
        : "";

    if (modo === "ejecucion") {
      const accion =
        await this.crearAccionVentaPendiente(
          vinculacion,
          comercioId,
          borrador,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.confirmacion_pendiente",
        respuesta:
          `La venta está lista para confirmar: ${borrador.clienteNombre}, ${cantidad} × ${producto.nombre} a ${this.formatearMoneda(precioUnitario)} + IVA ${ivaPorcentaje}%, total ${this.formatearMoneda(totalEstimado)}.${stockTexto} No incluye descuentos, percepciones ni pago inicial. Si confirmás, Drito creará una venta REAL y el stock se actualizará por el circuito normal de Ventas.`,
        acciones: [
          {
            id:
              `confirmar-venta-${accion.id}`,
            tipo:
              "confirmar_venta",
            label:
              "Confirmar venta real",
            accionId:
              accion.id,
            expiresAt:
              accion.expires_at,
            resumen:
              borrador,
          },
          {
            id:
              `revisar-venta-${accion.id}`,
            tipo:
              "preparar_venta",
            label:
              "Revisar en formulario",
            path:
              "/app/ventas?drito=venta-preparada",
            borrador,
          },
        ] satisfies DritoAssistantAction[],
      };
    }

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "ventas.borrador_preparado",
      respuesta:
        `Preparé un borrador para ${borrador.clienteNombre}: ${cantidad} × ${producto.nombre} a ${this.formatearMoneda(precioUnitario)} + IVA ${ivaPorcentaje}%. Total estimado: ${this.formatearMoneda(totalEstimado)}.${stockTexto} No incluí descuentos, percepciones ni pago inicial. Revisá todo antes de confirmar.`,
      acciones: [
        {
          id:
            "abrir-venta-preparada",
          tipo:
            "preparar_venta",
          label:
            "Abrir venta preparada",
          path:
            "/app/ventas?drito=venta-preparada",
          borrador,
        },
      ] satisfies DritoAssistantAction[],
    };
  }




  private numeroArgentinoAFloat(
    valor: string,
  ): number | null {
    let limpio = valor
      .trim()
      .replace(/\s/g, "")
      .replace(/^\$/, "");

    if (!limpio) {
      return null;
    }

    const tienePunto =
      limpio.includes(".");
    const tieneComa =
      limpio.includes(",");

    if (tienePunto && tieneComa) {
      // Convención argentina: 1.234,56
      limpio =
        limpio
          .replace(/\./g, "")
          .replace(",", ".");
    } else if (tienePunto) {
      if (
        /^\d{1,3}(?:\.\d{3})+$/.test(
          limpio,
        )
      ) {
        limpio =
          limpio.replace(/\./g, "");
      }
    } else if (tieneComa) {
      limpio =
        limpio.replace(",", ".");
    }

    const numero =
      Number(limpio);

    return Number.isFinite(numero)
      ? numero
      : null;
  }

  private extraerMedioPagoCobro(
    mensaje: string,
  ):
    | {
      codigo:
      CobroPreparadoDrito["medioPago"];
      label: string;
    }
    | null {
    const texto =
      this.normalizarTexto(mensaje);

    const opciones: Array<{
      patrones: string[];
      codigo:
      CobroPreparadoDrito["medioPago"];
      label: string;
    }> = [
        {
          patrones: [
            "transferencia",
            "transfer",
          ],
          codigo: "transferencia",
          label: "Transferencia",
        },
        {
          patrones: [
            "efectivo",
            "cash",
          ],
          codigo: "efectivo",
          label: "Efectivo",
        },
        {
          patrones: [
            "tarjeta de debito",
            "debito",
          ],
          codigo: "tarjeta_debito",
          label: "Tarjeta de débito",
        },
        {
          patrones: [
            "tarjeta de credito",
            "credito",
          ],
          codigo: "tarjeta_credito",
          label: "Tarjeta de crédito",
        },
        {
          patrones: [
            "billetera virtual",
            "mercado pago",
            "billetera",
          ],
          codigo: "billetera_virtual",
          label: "Billetera virtual",
        },
        {
          patrones: [
            "cheque",
          ],
          codigo: "cheque",
          label: "Cheque",
        },
        {
          patrones: [
            "deposito",
          ],
          codigo: "deposito",
          label: "Depósito",
        },
      ];

    for (const opcion of opciones) {
      if (
        opcion.patrones.some(
          (patron) =>
            texto.includes(patron),
        )
      ) {
        return {
          codigo:
            opcion.codigo,
          label:
            opcion.label,
        };
      }
    }

    return null;
  }

  private extraerPedidoCobro(
    mensaje: string,
  ):
    | {
      numeroVenta: number;
      importe: number;
      medioPago:
      CobroPreparadoDrito["medioPago"];
      medioPagoLabel: string;
    }
    | null {
    const ventaMatch =
      /vta\s*[- ]?\s*0*(\d+)/i.exec(
        mensaje,
      );

    if (!ventaMatch) {
      return null;
    }

    const numeroVenta =
      Number(ventaMatch[1]);

    const importeMatch =
      /(?:cobro|pago)\s+(?:de\s+)?\$?\s*([\d.]+(?:,\d{1,2})?)/i.exec(
        mensaje,
      ) ??
      /(?:registra(?:me)?|carga(?:me)?|anota(?:me)?|cobra(?:le)?)\s+(?:un\s+)?(?:cobro\s+|pago\s+)?(?:de\s+)?\$?\s*([\d.]+(?:,\d{1,2})?)/i.exec(
        mensaje,
      );

    const importe =
      importeMatch
        ? this.numeroArgentinoAFloat(
          importeMatch[1],
        )
        : null;

    const medio =
      this.extraerMedioPagoCobro(
        mensaje,
      );

    if (
      !Number.isInteger(numeroVenta) ||
      numeroVenta <= 0 ||
      importe === null ||
      !Number.isFinite(importe) ||
      importe <= 0 ||
      !medio
    ) {
      return null;
    }

    return {
      numeroVenta,
      importe:
        Math.round(
          importe * 100,
        ) / 100,
      medioPago:
        medio.codigo,
      medioPagoLabel:
        medio.label,
    };
  }






  private sumarDiasIso(
    fechaIso: string,
    dias: number,
  ): string | null {
    if (
      !fechaIso ||
      !Number.isFinite(dias) ||
      dias <= 0
    ) {
      return null;
    }

    const fecha =
      new Date(
        `${fechaIso}T12:00:00Z`,
      );

    fecha.setUTCDate(
      fecha.getUTCDate() +
      Math.trunc(dias),
    );

    return fecha
      .toISOString()
      .slice(0, 10);
  }

  private etiquetaTratamientoIvaCompra(
    tratamiento:
      CompraPreparadaDrito["ivaTratamiento"],
  ): string {
    const etiquetas: Record<
      CompraPreparadaDrito["ivaTratamiento"],
      string
    > = {
      computable:
        "Computable",
      no_computable:
        "No computable",
      exento:
        "Exento",
      no_gravado:
        "No gravado",
    };

    return etiquetas[tratamiento];
  }

  private extraerPedidoCompra(
    mensaje: string,
  ):
    | {
      cantidad: number;
      producto: string;
      proveedor: string;
      costoUnitario: number;
      ivaTratamiento:
      CompraPreparadaDrito["ivaTratamiento"];
      ivaPorcentaje: number | null;
    }
    | null {
    const normalizado =
      mensaje
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          "",
        )
        .replace(/[¿?¡!]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const patron =
      /^(?:registra(?:me)?|crea(?:me)?|carga(?:me)?|anota(?:me)?)\s+(?:una\s+)?compra\s+de\s+(\d+(?:[.,]\d+)?)\s+(.+?)\s+(?:a|de)\s+(.+?)\s+por\s+\$?\s*([\d.]+(?:,\d{1,2})?)\s*(?:cada\s+uno|cada\s+una|c\/u|por\s+unidad)?\s+con\s+iva\s+(computable|no\s+computable|exento|no\s+gravado)(?:\s+(\d+(?:[.,]\d+)?)\s*%)?\s*$/i;

    const match =
      patron.exec(
        normalizado,
      );

    if (!match) {
      return null;
    }

    const cantidad =
      this.numeroArgentinoAFloat(
        match[1],
      );

    const costoUnitario =
      this.numeroArgentinoAFloat(
        match[4],
      );

    const tratamientoTexto =
      this.normalizarTexto(
        match[5],
      );

    const ivaTratamiento:
      CompraPreparadaDrito["ivaTratamiento"] =
      tratamientoTexto ===
        "no computable"
        ? "no_computable"
        : tratamientoTexto ===
          "no gravado"
          ? "no_gravado"
          : tratamientoTexto as
          CompraPreparadaDrito["ivaTratamiento"];

    const ivaPorcentaje =
      match[6]
        ? this.numeroArgentinoAFloat(
          match[6],
        )
        : null;

    if (
      cantidad === null ||
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      costoUnitario === null ||
      !Number.isFinite(
        costoUnitario,
      ) ||
      costoUnitario < 0 ||
      !match[2].trim() ||
      !match[3].trim()
    ) {
      return null;
    }

    if (
      (
        ivaTratamiento ===
        "computable" ||
        ivaTratamiento ===
        "no_computable"
      ) &&
      (
        ivaPorcentaje === null ||
        !Number.isFinite(
          ivaPorcentaje,
        ) ||
        ivaPorcentaje < 0 ||
        ivaPorcentaje > 100
      )
    ) {
      return null;
    }

    return {
      cantidad:
        Math.round(
          cantidad * 1000,
        ) / 1000,
      producto:
        match[2].trim(),
      proveedor:
        match[3].trim(),
      costoUnitario:
        Math.round(
          costoUnitario * 100,
        ) / 100,
      ivaTratamiento,
      ivaPorcentaje:
        ivaTratamiento ===
          "exento" ||
          ivaTratamiento ===
          "no_gravado"
          ? 0
          : Math.round(
            Number(
              ivaPorcentaje,
            ) * 10000,
          ) / 10000,
    };
  }

  private nombreProveedorCompraDrito(
    proveedor:
      ProveedorCompraPreparacionDrito,
  ): string {
    return (
      proveedor.razon_social?.trim() ||
      proveedor.nombre?.trim() ||
      "Proveedor sin nombre"
    );
  }

  private async crearAccionCompraPendiente(
    vinculacion: UsuarioComercio,
    comercioId: string,
    borrador: CompraPreparadaDrito,
  ): Promise<AccionDritoPersistida> {
    const expiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000,
      ).toISOString();

    const { data, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .insert({
          usuario_id:
            vinculacion.usuario_id,
          comercio_id:
            comercioId,
          tipo:
            "crear_compra",
          estado:
            "pendiente",
          payload:
            borrador,
          expires_at:
            expiresAt,
        })
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo preparar la confirmación segura de la compra: ${error.message}`,
      );
    }

    return data as AccionDritoPersistida;
  }

  private async prepararCompraDesdeMensaje(
    comercioId: string,
    vinculacion: UsuarioComercio,
    mensaje: string,
  ) {
    await this.exigirPermiso(
      vinculacion,
      "compras.crear",
    );

    const texto =
      this.normalizarTexto(
        mensaje,
      );

    if (
      /\bpercepcion(?:es)?\b/.test(
        texto,
      )
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "compras.percepciones_no_habilitadas_chat",
        respuesta:
          "21A.4.11 crea compras simples sin percepciones sufridas. Si la factura del proveedor incluye una percepción, usá el formulario completo de Compras para no omitir información fiscal.",
        acciones: [
          {
            id:
              "ir-compras-percepciones",
            tipo:
              "navegar",
            label:
              "Ir a Compras",
            path:
              "/app/compras",
          },
        ] satisfies DritoAssistantAction[],
      };
    }

    if (
      /\b(pago|pagado|abonado|anticipo)\b/.test(
        texto,
      )
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "compras.pago_inicial_no_habilitado_chat",
        respuesta:
          "En 21A.4.11 Drito crea la compra y la deja pendiente, sin registrar pagos ni mover Caja. Si querés cargar un pago junto con la compra, hacelo desde el circuito completo de Compras o registralo luego como operación separada.",
        acciones: [
          {
            id:
              "ir-compras-pago-inicial",
            tipo:
              "navegar",
            label:
              "Ir a Compras",
            path:
              "/app/compras",
          },
        ] satisfies DritoAssistantAction[],
      };
    }

    const pedido =
      this.extraerPedidoCompra(
        mensaje,
      );

    if (!pedido) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "compras.registro_incompleto",
        respuesta:
          "Para preparar una compra necesito cantidad, artículo, proveedor, costo unitario y tratamiento de IVA. Ejemplo: “Registrá una compra de 2 cascos de seguridad a Distribuidora Central S.A. por $30.000 cada uno con IVA computable 21%”.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const {
      data:
      proveedoresData,
      error:
      proveedoresError,
    } =
      await this.supabase.client
        .from("proveedores")
        .select(
          "id, nombre, razon_social, documento, plazo_pago_dias, activo",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "activo",
          true,
        )
        .limit(500);

    if (proveedoresError) {
      throw proveedoresError;
    }

    const proveedores =
      (proveedoresData ??
        []) as
      ProveedorCompraPreparacionDrito[];

    const proveedorElegido =
      this.elegirCoincidenciaUnica(
        pedido.proveedor,
        proveedores,
        (
          proveedor,
        ) => [
            proveedor.nombre,
            proveedor.razon_social,
            proveedor.documento,
          ],
      );

    if (
      proveedorElegido.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "compras.proveedor_no_encontrado",
        respuesta:
          `No encontré un proveedor activo que coincida con “${pedido.proveedor}” en esta empresa. No voy a crear una compra contra otro proveedor por aproximación.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      proveedorElegido.estado ===
      "ambiguo"
    ) {
      const nombres =
        proveedorElegido.candidatos
          .map(
            (proveedor) =>
              this.nombreProveedorCompraDrito(
                proveedor,
              ),
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "compras.proveedor_ambiguo",
        respuesta:
          `Encontré más de un proveedor posible para “${pedido.proveedor}”: ${nombres}. Decime cuál corresponde antes de crear una compra real.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const proveedor =
      proveedorElegido.valor;

    const {
      data:
      articulosData,
      error:
      articulosError,
    } =
      await this.supabase.client
        .from("productos")
        .select(
          "id, tipo, codigo, nombre, descripcion, unidad_medida, costo, iva_porcentaje, controla_stock, stock_actual, activo",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "activo",
          true,
        )
        .limit(500);

    if (articulosError) {
      throw articulosError;
    }

    const articulos =
      (articulosData ??
        []) as
      ArticuloCompraPreparacionDrito[];

    const articuloElegido =
      this.elegirCoincidenciaUnica(
        pedido.producto,
        articulos,
        (
          articulo,
        ) => [
            articulo.nombre,
            articulo.codigo,
            articulo.descripcion,
          ],
      );

    if (
      articuloElegido.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "compras.articulo_no_encontrado",
        respuesta:
          `No encontré un artículo activo que coincida con “${pedido.producto}” en esta empresa. No voy a comprar otro artículo por aproximación.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      articuloElegido.estado ===
      "ambiguo"
    ) {
      const nombres =
        articuloElegido.candidatos
          .map(
            (articulo) =>
              articulo.codigo
                ? `${articulo.nombre} (${articulo.codigo})`
                : articulo.nombre,
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "compras.articulo_ambiguo",
        respuesta:
          `Encontré más de un artículo posible para “${pedido.producto}”: ${nombres}. Indicame cuál corresponde.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const articulo =
      articuloElegido.valor;

    let ivaAlicuotaCodigo:
      number | null =
      null;

    let ivaPorcentaje =
      Number(
        pedido.ivaPorcentaje ??
        0,
      );

    if (
      pedido.ivaTratamiento ===
      "computable" ||
      pedido.ivaTratamiento ===
      "no_computable"
    ) {
      const {
        data:
        alicuotasData,
        error:
        alicuotasError,
      } =
        await this.supabase.client
          .from(
            "arca_alicuotas_iva",
          )
          .select(
            "codigo, descripcion, porcentaje, activo",
          )
          .eq(
            "activo",
            true,
          );

      if (alicuotasError) {
        throw alicuotasError;
      }

      const coincidencias =
        (
          alicuotasData ??
          []
        ).filter(
          (
            alicuota: {
              codigo:
              number | string;
              porcentaje:
              number | string | null;
            },
          ) =>
            alicuota.porcentaje !==
            null &&
            Math.abs(
              Number(
                alicuota.porcentaje,
              ) -
              ivaPorcentaje,
            ) <
            0.0001,
        );

      if (
        coincidencias.length !==
        1
      ) {
        return {
          ok: true,
          soloLectura: true,
          intencion:
            "compras.iva_alicuota_no_resuelta",
          respuesta:
            `No pude resolver de forma única en el catálogo ARCA una alícuota activa de IVA ${ivaPorcentaje}%. No voy a inventar un código fiscal.`,
          acciones: [
            {
              id:
                "ir-compras-iva",
              tipo:
                "navegar",
              label:
                "Ir a Compras",
              path:
                "/app/compras",
            },
          ] satisfies DritoAssistantAction[],
        };
      }

      ivaAlicuotaCodigo =
        Number(
          coincidencias[0]
            .codigo,
        );

      ivaPorcentaje =
        Number(
          coincidencias[0]
            .porcentaje,
        );
    } else {
      ivaPorcentaje = 0;
      ivaAlicuotaCodigo =
        null;
    }

    const fechaCompra =
      this.fechaActualArgentina();

    const plazoPagoDias =
      Number(
        proveedor.plazo_pago_dias ??
        0,
      );

    const fechaVencimiento =
      this.sumarDiasIso(
        fechaCompra,
        plazoPagoDias,
      );

    const subtotalEstimado =
      Math.round(
        pedido.cantidad *
        pedido.costoUnitario *
        100,
      ) / 100;

    const ivaEstimado =
      Math.round(
        subtotalEstimado *
        ivaPorcentaje /
        100 *
        100,
      ) / 100;

    const totalEstimado =
      Math.round(
        (
          subtotalEstimado +
          ivaEstimado
        ) *
        100,
      ) / 100;

    const controlaStock =
      articulo.tipo ===
      "producto" &&
      Boolean(
        articulo.controla_stock,
      );

    const stockAntes =
      controlaStock
        ? Math.round(
          Number(
            articulo.stock_actual ??
            0,
          ) *
          1000,
        ) / 1000
        : null;

    const stockDespuesEstimado =
      controlaStock &&
        stockAntes !== null
        ? Math.round(
          (
            stockAntes +
            pedido.cantidad
          ) *
          1000,
        ) / 1000
        : null;

    const {
      data:
      comprasProveedorData,
      error:
      comprasProveedorError,
    } =
      await this.supabase.client
        .from("compras")
        .select(
          "total, total_pagado, estado",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "proveedor_id",
          proveedor.id,
        )
        .eq(
          "estado",
          "confirmada",
        )
        .limit(1000);

    if (
      comprasProveedorError
    ) {
      throw comprasProveedorError;
    }

    const saldoProveedorAntes =
      Math.round(
        (
          comprasProveedorData ??
          []
        ).reduce(
          (
            acumulado,
            compra: {
              total:
              number | string | null;
              total_pagado:
              number | string | null;
            },
          ) =>
            acumulado +
            Math.max(
              Number(
                compra.total ??
                0,
              ) -
              Number(
                compra.total_pagado ??
                0,
              ),
              0,
            ),
          0,
        ) *
        100,
      ) / 100;

    const saldoProveedorDespuesEstimado =
      Math.round(
        (
          saldoProveedorAntes +
          totalEstimado
        ) *
        100,
      ) / 100;

    const costoAnterior =
      Math.round(
        Number(
          articulo.costo ??
          0,
        ) *
        100,
      ) / 100;

    const borrador:
      CompraPreparadaDrito = {
      proveedorId:
        proveedor.id,
      proveedorNombre:
        this.nombreProveedorCompraDrito(
          proveedor,
        ),
      proveedorDocumento:
        proveedor.documento?.trim() ||
        null,

      productoId:
        articulo.id,
      productoNombre:
        articulo.nombre,
      productoCodigo:
        articulo.codigo,
      unidadMedida:
        articulo.unidad_medida ||
        "unidad",

      fechaCompra,
      fechaVencimiento,

      tipoComprobante:
        "factura",
      numeroComprobante:
        null,
      moneda:
        "ARS",

      cantidad:
        pedido.cantidad,
      costoUnitario:
        pedido.costoUnitario,
      descuentoPorcentaje:
        0,
      descuentoGeneralPorcentaje:
        0,

      ivaTratamiento:
        pedido.ivaTratamiento,
      ivaTratamientoLabel:
        this.etiquetaTratamientoIvaCompra(
          pedido.ivaTratamiento,
        ),
      ivaPorcentaje,
      ivaAlicuotaCodigo,

      subtotalEstimado,
      ivaEstimado,
      totalEstimado,

      actualizarCostos:
        true,
      costoAnterior,
      costoPosteriorEstimado:
        pedido.costoUnitario,

      controlaStock,
      stockAntes,
      stockDespuesEstimado,

      saldoProveedorAntes,
      saldoProveedorDespuesEstimado,

      percepcionesIncluidas:
        false,
      pagoInicialIncluido:
        false,
    };

    const accion =
      await this.crearAccionCompraPendiente(
        vinculacion,
        comercioId,
        borrador,
      );

    const stockTexto =
      borrador.controlaStock
        ? ` Stock: ${borrador.stockAntes} → ${borrador.stockDespuesEstimado}.`
        : " El artículo no modifica stock.";

    const vencimientoTexto =
      borrador.fechaVencimiento
        ? ` Vencimiento estimado: ${borrador.fechaVencimiento}.`
        : "";

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "compras.registro_confirmacion_pendiente",
      respuesta:
        `La compra está lista para confirmar: ${borrador.proveedorNombre} · ${borrador.cantidad} × ${borrador.productoNombre}${borrador.productoCodigo ? ` (${borrador.productoCodigo})` : ""} a ${this.formatearMoneda(
          borrador.costoUnitario,
        )} c/u. IVA: ${borrador.ivaTratamientoLabel} ${borrador.ivaPorcentaje}%${borrador.ivaAlicuotaCodigo !== null ? ` (código ARCA ${borrador.ivaAlicuotaCodigo})` : ""}. Total estimado: ${this.formatearMoneda(
          borrador.totalEstimado,
        )}.${stockTexto} Costo actual del artículo: ${this.formatearMoneda(
          borrador.costoAnterior,
        )} → ${this.formatearMoneda(
          borrador.costoPosteriorEstimado,
        )}. Cuenta del proveedor: ${this.formatearMoneda(
          borrador.saldoProveedorAntes,
        )} → ${this.formatearMoneda(
          borrador.saldoProveedorDespuesEstimado,
        )}.${vencimientoTexto} Si confirmás, Drito creará una COMPRA REAL y actualizará costo/stock por el circuito normal. No registra pago, no mueve Caja, no incluye percepciones y no modifica ARCA.`,
      acciones: [
        {
          id:
            `confirmar-compra-${accion.id}`,
          tipo:
            "confirmar_compra",
          label:
            "Confirmar compra real",
          accionId:
            accion.id,
          expiresAt:
            accion.expires_at,
          resumen:
            borrador,
        },
        {
          id:
            `revisar-compras-${accion.id}`,
          tipo:
            "navegar",
          label:
            "Revisar Compras",
          path:
            "/app/compras",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  private extraerMedioPagoProveedor(
    mensaje: string,
  ):
    | {
      codigo:
      PagoProveedorPreparadoDrito["medioPago"];
      label: string;
    }
    | null {
    const texto =
      this.normalizarTexto(mensaje);

    const opciones: Array<{
      patrones: string[];
      codigo:
      PagoProveedorPreparadoDrito["medioPago"];
      label: string;
    }> = [
        {
          patrones: ["transferencia", "transfer"],
          codigo: "transferencia",
          label: "Transferencia",
        },
        {
          patrones: ["efectivo", "cash"],
          codigo: "efectivo",
          label: "Efectivo",
        },
        {
          patrones: ["tarjeta de debito", "debito"],
          codigo: "tarjeta_debito",
          label: "Tarjeta de débito",
        },
        {
          patrones: ["tarjeta de credito", "credito"],
          codigo: "tarjeta_credito",
          label: "Tarjeta de crédito",
        },
        {
          patrones: ["mercado pago"],
          codigo: "mercado_pago",
          label: "Mercado Pago",
        },
        {
          patrones: ["cheque"],
          codigo: "cheque",
          label: "Cheque",
        },
        {
          patrones: ["otro"],
          codigo: "otro",
          label: "Otro",
        },
      ];

    for (const opcion of opciones) {
      if (
        opcion.patrones.some(
          (patron) => texto.includes(patron),
        )
      ) {
        return {
          codigo: opcion.codigo,
          label: opcion.label,
        };
      }
    }

    return null;
  }

  private extraerPedidoPagoProveedor(
    mensaje: string,
  ):
    | {
      importe: number;
      proveedor: string;
      medioPago:
      PagoProveedorPreparadoDrito["medioPago"];
      medioPagoLabel: string;
    }
    | null {
    const normalizado =
      mensaje
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[¿?¡!]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const patrones = [
      /(?:registra(?:me)?|carga(?:me)?|anota(?:me)?)\s+(?:un\s+)?pago\s+(?:de\s+)?\$?\s*([\d.]+(?:,\d{1,2})?)\s+(?:a|para)\s+(.+)$/i,
      /(?:paga(?:le)?|abona(?:le)?)\s+\$?\s*([\d.]+(?:,\d{1,2})?)\s+(?:a\s+)?(.+)$/i,
    ];

    let match: RegExpExecArray | null = null;

    for (const patron of patrones) {
      match = patron.exec(normalizado);
      if (match) {
        break;
      }
    }

    if (!match) {
      return null;
    }

    const importe =
      this.numeroArgentinoAFloat(match[1]);

    const medio =
      this.extraerMedioPagoProveedor(
        mensaje,
      );

    if (
      importe === null ||
      !Number.isFinite(importe) ||
      importe <= 0 ||
      !medio
    ) {
      return null;
    }

    let proveedor =
      match[2]
        .trim()
        .replace(/[.,;:]+$/g, "")
        .trim();

    proveedor = proveedor
      .replace(
        /\s+(?:pagado|pago|abonado)?\s*(?:por|con|via|mediante)\s+(?:transferencia|efectivo|tarjeta\s+de\s+debito|tarjeta\s+de\s+credito|debito|credito|mercado\s+pago|cheque|otro)\s*$/i,
        "",
      )
      .trim();

    if (proveedor.length < 2) {
      return null;
    }

    return {
      importe:
        Math.round(importe * 100) / 100,
      proveedor,
      medioPago:
        medio.codigo,
      medioPagoLabel:
        medio.label,
    };
  }

  private nombreProveedorPago(
    proveedor: ProveedorPagoPreparacion,
  ): string {
    return (
      proveedor.razon_social?.trim() ||
      proveedor.nombre?.trim() ||
      "Proveedor sin nombre"
    );
  }

  private async crearAccionPagoProveedorPendiente(
    vinculacion: UsuarioComercio,
    comercioId: string,
    borrador: PagoProveedorPreparadoDrito,
  ): Promise<AccionDritoPersistida> {
    const expiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000,
      ).toISOString();

    const { data, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .insert({
          usuario_id:
            vinculacion.usuario_id,
          comercio_id:
            comercioId,
          tipo:
            "registrar_pago_proveedor",
          estado:
            "pendiente",
          payload:
            borrador,
          expires_at:
            expiresAt,
        })
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo preparar la confirmación segura del pago a proveedor: ${error.message}`,
      );
    }

    return data as AccionDritoPersistida;
  }

  private async prepararPagoProveedorDesdeMensaje(
    comercioId: string,
    vinculacion: UsuarioComercio,
    mensaje: string,
  ) {
    await this.exigirPermiso(
      vinculacion,
      "cuentas_proveedores.registrar_pagos",
    );

    const texto =
      this.normalizarTexto(mensaje);

    if (
      /\bretencion(?:es)?\b/.test(texto)
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cuentas_proveedores.pago_con_retenciones_no_habilitado_chat",
        respuesta:
          "Este paso de Drito Chat registra únicamente dinero real sin retenciones practicadas. Para un pago con retenciones usá el circuito normal de Compras / Cuenta corriente del proveedor; no voy a omitir una retención de forma silenciosa.",
        acciones: [
          {
            id: "ir-cuentas-proveedores-retenciones",
            tipo: "navegar",
            label: "Ir a cuentas de proveedores",
            path:
              "/app/cuentas-corrientes/proveedores",
          },
        ] satisfies DritoAssistantAction[],
      };
    }

    const pedido =
      this.extraerPedidoPagoProveedor(
        mensaje,
      );

    if (!pedido) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cuentas_proveedores.pago_incompleto",
        respuesta:
          "Para preparar un pago a proveedor necesito importe, proveedor y medio de pago. Probá, por ejemplo: “Registrá un pago de $100.000 a Proveedor X por transferencia”.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const { data: proveedoresData, error: proveedoresError } =
      await this.supabase.client
        .from("proveedores")
        .select(
          "id, nombre, razon_social, documento, activo",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq("activo", true)
        .limit(500);

    if (proveedoresError) {
      throw proveedoresError;
    }

    const proveedores =
      (proveedoresData ??
        []) as ProveedorPagoPreparacion[];

    const proveedorElegido =
      this.elegirCoincidenciaUnica(
        pedido.proveedor,
        proveedores,
        (proveedor) => [
          proveedor.nombre,
          proveedor.razon_social,
          proveedor.documento,
        ],
      );

    if (
      proveedorElegido.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cuentas_proveedores.proveedor_no_encontrado",
        respuesta:
          `No encontré un proveedor activo que coincida con “${pedido.proveedor}” en esta empresa. No voy a registrar dinero contra otro proveedor por aproximación.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      proveedorElegido.estado ===
      "ambiguo"
    ) {
      const nombres =
        proveedorElegido.candidatos
          .map(
            (proveedor) =>
              this.nombreProveedorPago(
                proveedor,
              ),
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cuentas_proveedores.proveedor_ambiguo",
        respuesta:
          `Encontré más de un proveedor posible para “${pedido.proveedor}”: ${nombres}. Decime cuál corresponde antes de registrar un pago real.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const proveedor =
      proveedorElegido.valor;

    const proveedorNombre =
      this.nombreProveedorPago(
        proveedor,
      );

    const { data: comprasData, error: comprasError } =
      await this.supabase.client
        .from("compras")
        .select(
          "id, total, total_pagado, estado",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "proveedor_id",
          proveedor.id,
        )
        .eq(
          "estado",
          "confirmada",
        )
        .limit(1000);

    if (comprasError) {
      throw comprasError;
    }

    // En compras NO existe una columna saldo_pendiente persistida.
    // La deuda se obtiene de total - total_pagado.
    //
    // Desde el motor central de cancelación de compras,
    // total_pagado representa deuda cancelada:
    // dinero + retenciones practicadas vigentes.
    //
    // La confirmación final vuelve a revalidar el saldo usando
    // registrar_pago_cuenta_proveedor(), que utiliza el motor
    // canónico __drito_calcular_cancelacion_compra().
    const saldoAntes =
      Math.round(
        (comprasData ?? []).reduce(
          (
            acumulado,
            compra: {
              total:
              number | string | null;
              total_pagado:
              number | string | null;
            },
          ) => {
            const totalCompra =
              Number(
                compra.total ?? 0,
              );

            const totalCancelado =
              Number(
                compra.total_pagado ?? 0,
              );

            return (
              acumulado +
              Math.max(
                totalCompra -
                totalCancelado,
                0,
              )
            );
          },
          0,
        ) * 100,
      ) / 100;

    if (saldoAntes <= 0) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cuentas_proveedores.sin_deuda",
        respuesta:
          `${proveedorNombre} no tiene saldo pendiente para aplicar un pago agrupado. No preparé ningún egreso.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      pedido.importe >
      saldoAntes
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cuentas_proveedores.pago_supera_saldo",
        respuesta:
          `No preparé el pago porque ${proveedorNombre} tiene un saldo pendiente de ${this.formatearMoneda(
            saldoAntes,
          )} y pediste pagar ${this.formatearMoneda(
            pedido.importe,
          )}. Drito no aplicará un pago mayor a la deuda.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const saldoDespuesEstimado =
      Math.round(
        Math.max(
          saldoAntes -
          pedido.importe,
          0,
        ) * 100,
      ) / 100;

    const borrador:
      PagoProveedorPreparadoDrito = {
      proveedorId:
        proveedor.id,
      proveedorNombre,
      proveedorDocumento:
        proveedor.documento?.trim() ||
        null,

      fechaPago:
        this.fechaActualArgentina(),
      importe:
        pedido.importe,

      medioPago:
        pedido.medioPago,
      medioPagoLabel:
        pedido.medioPagoLabel,

      saldoAntes,
      saldoDespuesEstimado,

      referencia: null,
      observaciones:
        "Pago a proveedor confirmado desde Drito Chat",
    };

    const accion =
      await this.crearAccionPagoProveedorPendiente(
        vinculacion,
        comercioId,
        borrador,
      );

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "cuentas_proveedores.pago_confirmacion_pendiente",
      respuesta:
        `El pago está listo para confirmar: ${borrador.proveedorNombre}. Importe: ${this.formatearMoneda(
          borrador.importe,
        )}. Saldo actual: ${this.formatearMoneda(
          borrador.saldoAntes,
        )} → saldo estimado: ${this.formatearMoneda(
          borrador.saldoDespuesEstimado,
        )}. Medio: ${borrador.medioPagoLabel}. Fecha: ${borrador.fechaPago}. Si confirmás, Drito registrará un PAGO REAL agrupado, lo aplicará a las compras pendientes y generará un EGRESO en Caja por ${this.formatearMoneda(
          borrador.importe,
        )}. Este flujo no incluye retenciones practicadas y no modifica ARCA.`,
      acciones: [
        {
          id:
            `confirmar-pago-proveedor-${accion.id}`,
          tipo:
            "confirmar_pago_proveedor",
          label:
            "Confirmar pago real",
          accionId:
            accion.id,
          expiresAt:
            accion.expires_at,
          resumen:
            borrador,
        },
        {
          id:
            `revisar-cuenta-proveedor-${proveedor.id}`,
          tipo: "navegar",
          label:
            "Revisar cuenta proveedor",
          path:
            "/app/cuentas-corrientes/proveedores",
        },
      ] satisfies DritoAssistantAction[],
    };
  }

  private extraerMedioPagoGasto(
    mensaje: string,
  ):
    | {
      codigo:
      GastoPreparadoDrito["medioPago"];
      label: string;
    }
    | null {
    const texto =
      this.normalizarTexto(mensaje);

    const opciones: Array<{
      patrones: string[];
      codigo:
      GastoPreparadoDrito["medioPago"];
      label: string;
    }> = [
        {
          patrones: ["transferencia", "transfer"],
          codigo: "transferencia",
          label: "Transferencia",
        },
        {
          patrones: ["efectivo", "cash"],
          codigo: "efectivo",
          label: "Efectivo",
        },
        {
          patrones: ["tarjeta de debito", "debito"],
          codigo: "tarjeta_debito",
          label: "Tarjeta de débito",
        },
        {
          patrones: ["tarjeta de credito", "credito"],
          codigo: "tarjeta_credito",
          label: "Tarjeta de crédito",
        },
        {
          patrones: ["mercado pago"],
          codigo: "mercado_pago",
          label: "Mercado Pago",
        },
        {
          patrones: ["cheque"],
          codigo: "cheque",
          label: "Cheque",
        },
      ];

    for (const opcion of opciones) {
      if (
        opcion.patrones.some(
          (patron) =>
            texto.includes(patron),
        )
      ) {
        return {
          codigo: opcion.codigo,
          label: opcion.label,
        };
      }
    }

    return null;
  }

  private extraerPedidoGasto(
    mensaje: string,
  ):
    | {
      importe: number;
      detalle: string;
      medioPago:
      GastoPreparadoDrito["medioPago"];
      medioPagoLabel: string;
    }
    | null {
    const normalizado =
      mensaje
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          "",
        )
        .replace(/[¿?¡!]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const importeMatch =
      /gasto\s+(?:de\s+)?\$?\s*([\d.]+(?:,\d{1,2})?)/i.exec(
        normalizado,
      );

    if (!importeMatch) {
      return null;
    }

    const importe =
      this.numeroArgentinoAFloat(
        importeMatch[1],
      );

    if (
      importe === null ||
      !Number.isFinite(importe) ||
      importe <= 0
    ) {
      return null;
    }

    let resto =
      normalizado
        .slice(
          (importeMatch.index ?? 0) +
          importeMatch[0].length,
        )
        .trim();

    resto = resto
      .replace(
        /^(?:de|por|en)\s+/i,
        "",
      )
      .trim();

    const pagoMatch =
      /\s+(?:pagado|pago|abonado)\s+(?:por|con|en)\s+.+$/i.exec(
        resto,
      );

    const detalle =
      (
        pagoMatch
          ? resto.slice(
            0,
            pagoMatch.index,
          )
          : resto
      )
        .trim()
        .replace(/[.,;:]+$/g, "")
        .trim();

    const medio =
      this.extraerMedioPagoGasto(
        mensaje,
      );

    if (
      detalle.length < 2 ||
      !medio
    ) {
      return null;
    }

    return {
      importe:
        Math.round(
          importe * 100,
        ) / 100,
      detalle,
      medioPago:
        medio.codigo,
      medioPagoLabel:
        medio.label,
    };
  }

  private async crearAccionGastoPendiente(
    vinculacion: UsuarioComercio,
    comercioId: string,
    borrador: GastoPreparadoDrito,
  ): Promise<AccionDritoPersistida> {
    const expiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000,
      ).toISOString();

    const { data, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .insert({
          usuario_id:
            vinculacion.usuario_id,
          comercio_id:
            comercioId,
          tipo:
            "registrar_gasto_general",
          estado:
            "pendiente",
          payload:
            borrador,
          expires_at:
            expiresAt,
        })
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo preparar la confirmación segura del gasto: ${error.message}`,
      );
    }

    return data as AccionDritoPersistida;
  }

  private async prepararGastoDesdeMensaje(
    comercioId: string,
    vinculacion: UsuarioComercio,
    mensaje: string,
  ) {
    await this.exigirPermiso(
      vinculacion,
      "gastos.registrar",
    );

    const pedido =
      this.extraerPedidoGasto(
        mensaje,
      );

    if (!pedido) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "gastos.registro_incompleto",
        respuesta:
          "Para preparar un gasto necesito importe, concepto o categoría y medio de pago. Probá, por ejemplo: “Registrá un gasto de $25.000 de combustible pagado por transferencia”.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const { data, error } =
      await this.supabase.client
        .from(
          "categorias_gastos",
        )
        .select(
          "id, nombre, descripcion, activo",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "activo",
          true,
        )
        .order(
          "orden",
          {
            ascending: true,
          },
        )
        .order(
          "nombre",
          {
            ascending: true,
          },
        );

    if (error) {
      throw error;
    }

    const categorias =
      (data ??
        []) as CategoriaGastoPreparacion[];

    const categoriaElegida =
      this.elegirCoincidenciaUnica(
        pedido.detalle,
        categorias,
        (categoria) => [
          categoria.nombre,
          categoria.descripcion,
        ],
      );

    if (
      categoriaElegida.estado ===
      "no_encontrado"
    ) {
      const disponibles =
        categorias
          .slice(0, 8)
          .map(
            (categoria) =>
              categoria.nombre,
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "gastos.categoria_no_encontrada",
        respuesta:
          `No encontré una categoría activa que coincida con “${pedido.detalle}”. No voy a inventar ni crear una categoría automáticamente.${disponibles ? ` Categorías disponibles: ${disponibles}.` : ""}`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      categoriaElegida.estado ===
      "ambiguo"
    ) {
      const nombres =
        categoriaElegida.candidatos
          .map(
            (categoria) =>
              categoria.nombre,
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "gastos.categoria_ambigua",
        respuesta:
          `Encontré más de una categoría posible para “${pedido.detalle}”: ${nombres}. Indicame cuál corresponde antes de registrar dinero real.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const categoria =
      categoriaElegida.valor;

    const borrador:
      GastoPreparadoDrito = {
      categoriaId:
        categoria.id,
      categoriaNombre:
        categoria.nombre,
      fechaGasto:
        this.fechaActualArgentina(),
      concepto:
        pedido.detalle.slice(
          0,
          120,
        ),
      importe:
        pedido.importe,
      medioPago:
        pedido.medioPago,
      medioPagoLabel:
        pedido.medioPagoLabel,
      beneficiario: null,
      referencia: null,
      observaciones:
        "Gasto confirmado desde Drito Chat",
    };

    const accion =
      await this.crearAccionGastoPendiente(
        vinculacion,
        comercioId,
        borrador,
      );

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "gastos.registro_confirmacion_pendiente",
      respuesta:
        `El gasto está listo para confirmar: ${borrador.categoriaNombre} · ${borrador.concepto}. Importe: ${this.formatearMoneda(
          borrador.importe,
        )}. Medio de pago: ${borrador.medioPagoLabel}. Fecha: ${borrador.fechaGasto}. Si confirmás, Drito registrará un GASTO REAL y generará un egreso de Caja por ${this.formatearMoneda(
          borrador.importe,
        )} mediante el circuito normal. No emitirá ni modificará comprobantes ARCA.`,
      acciones: [
        {
          id:
            `confirmar-gasto-${accion.id}`,
          tipo:
            "confirmar_gasto",
          label:
            "Confirmar gasto real",
          accionId:
            accion.id,
          expiresAt:
            accion.expires_at,
          resumen:
            borrador,
        },
        {
          id:
            `revisar-gastos-${accion.id}`,
          tipo:
            "navegar",
          label:
            "Revisar Gastos",
          path:
            "/app/gastos",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  private extraerPedidoAjusteStock(
    mensaje: string,
  ):
    | {
      producto: string;
      stockObjetivo: number;
      motivo: string;
    }
    | null {
    const limpio = mensaje
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase()
      .replace(/[¿?¡!]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const patrones = [
      /^(?:ajusta|ajustame|corrige|corregime)\s+(?:el\s+)?(?:stock|inventario|existencias)\s+(?:de|del)\s+(.+?)\s+(?:a|en)\s+(\d+(?:[.,]\d+)?)\s+(?:porque|por)\s+(.+)$/,
      /^(?:ajusta|ajustame|corrige|corregime)\s+(.+?)\s+(?:a|en)\s+(\d+(?:[.,]\d+)?)\s+(?:porque|por)\s+(.+)$/,
    ];

    let match: RegExpExecArray | null =
      null;

    for (const patron of patrones) {
      match =
        patron.exec(limpio);

      if (match) {
        break;
      }
    }

    if (!match) {
      return null;
    }

    const producto =
      match[1].trim();

    const stockObjetivo =
      Number(
        match[2].replace(
          ",",
          ".",
        ),
      );

    const motivo =
      match[3].trim();

    if (
      !producto ||
      !Number.isFinite(
        stockObjetivo,
      ) ||
      stockObjetivo < 0 ||
      motivo.length < 3
    ) {
      return null;
    }

    return {
      producto,
      stockObjetivo:
        Math.round(
          stockObjetivo *
          1000,
        ) / 1000,
      motivo,
    };
  }

  private async crearAccionStockAjustePendiente(
    vinculacion: UsuarioComercio,
    comercioId: string,
    borrador: StockAjustePreparadoDrito,
  ): Promise<AccionDritoPersistida> {
    const expiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000,
      ).toISOString();

    const { data, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .insert({
          usuario_id:
            vinculacion.usuario_id,
          comercio_id:
            comercioId,
          tipo:
            "ajustar_stock_objetivo",
          estado:
            "pendiente",
          payload:
            borrador,
          expires_at:
            expiresAt,
        })
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo preparar la confirmación segura del ajuste de stock: ${error.message}`,
      );
    }

    return data as AccionDritoPersistida;
  }

  private async prepararAjusteStockDesdeMensaje(
    comercioId: string,
    vinculacion: UsuarioComercio,
    mensaje: string,
  ) {
    await this.exigirPermiso(
      vinculacion,
      "stock.ajustar",
    );

    const pedido =
      this.extraerPedidoAjusteStock(
        mensaje,
      );

    if (!pedido) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.ajuste_incompleto",
        respuesta:
          "Para preparar un ajuste necesito producto, stock objetivo y motivo. Probá, por ejemplo: “Ajustá el stock de cascos de seguridad a 8 porque el conteo físico dio 8”.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const { data, error } =
      await this.supabase.client
        .from("productos")
        .select(
          "id, tipo, codigo, nombre, descripcion, unidad_medida, controla_stock, stock_actual, activo",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq("activo", true)
        .eq("tipo", "producto")
        .eq(
          "controla_stock",
          true,
        )
        .limit(500);

    if (error) {
      throw error;
    }

    const productos =
      (data ??
        []) as Array<
          ProductoPreparacionVenta & {
            activo: boolean;
          }
        >;

    const productoElegido =
      this.elegirCoincidenciaUnica(
        pedido.producto,
        productos,
        (producto) => [
          producto.nombre,
          producto.codigo,
          producto.descripcion,
        ],
      );

    if (
      productoElegido.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.ajuste_producto_no_encontrado",
        respuesta:
          `No encontré un producto activo que administre stock y coincida con “${pedido.producto}” en esta empresa. No voy a ajustar otro artículo por aproximación.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      productoElegido.estado ===
      "ambiguo"
    ) {
      const nombres =
        productoElegido.candidatos
          .map(
            (producto) =>
              producto.codigo
                ? `${producto.nombre} (${producto.codigo})`
                : producto.nombre,
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.ajuste_producto_ambiguo",
        respuesta:
          `Encontré más de un producto posible para “${pedido.producto}”: ${nombres}. Decime cuál querés ajustar.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const producto =
      productoElegido.valor;

    const stockAntes =
      Math.round(
        Number(
          producto.stock_actual ?? 0,
        ) *
        1000,
      ) / 1000;

    const stockObjetivo =
      pedido.stockObjetivo;

    const diferencia =
      Math.round(
        (
          stockObjetivo -
          stockAntes
        ) *
        1000,
      ) / 1000;

    if (diferencia === 0) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.ajuste_sin_cambio",
        respuesta:
          `${producto.nombre} ya tiene ${stockAntes} ${producto.unidad_medida || "unidad"} en stock. El objetivo indicado coincide con la existencia actual, así que no preparé ningún movimiento.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const tipoMovimiento:
      StockAjustePreparadoDrito["tipoMovimiento"] =
      diferencia > 0
        ? "ajuste_positivo"
        : "ajuste_negativo";

    const cantidadMovimiento =
      Math.round(
        Math.abs(
          diferencia,
        ) *
        1000,
      ) / 1000;

    const borrador:
      StockAjustePreparadoDrito = {
      productoId:
        producto.id,
      productoNombre:
        producto.nombre,
      productoCodigo:
        producto.codigo,
      unidadMedida:
        producto.unidad_medida ||
        "unidad",

      stockAntes,
      stockObjetivo,
      diferencia,

      tipoMovimiento,
      cantidadMovimiento,

      motivo:
        pedido.motivo,
    };

    const accion =
      await this.crearAccionStockAjustePendiente(
        vinculacion,
        comercioId,
        borrador,
      );

    const signo =
      diferencia > 0
        ? "+"
        : "";

    const tipoTexto =
      diferencia > 0
        ? "positivo"
        : "negativo";

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "stock.ajuste_confirmacion_pendiente",
      respuesta:
        `El ajuste está listo para confirmar: ${borrador.productoNombre}${borrador.productoCodigo ? ` (${borrador.productoCodigo})` : ""}. Stock actual: ${borrador.stockAntes} → objetivo: ${borrador.stockObjetivo}. Diferencia: ${signo}${borrador.diferencia} ${borrador.unidadMedida} (${tipoTexto}). Motivo: ${borrador.motivo}. Si confirmás, Drito registrará un ajuste REAL de stock. No afectará Caja ni ARCA.`,
      acciones: [
        {
          id:
            `confirmar-stock-ajuste-${accion.id}`,
          tipo:
            "confirmar_stock_ajuste",
          label:
            "Confirmar ajuste real",
          accionId:
            accion.id,
          expiresAt:
            accion.expires_at,
          resumen:
            borrador,
        },
        {
          id:
            `ver-stock-ajuste-${producto.id}`,
          tipo:
            "navegar",
          label:
            "Revisar Stock",
          path:
            "/app/stock",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  private extraerPedidoSalidaStock(
    mensaje: string,
  ):
    | {
      cantidad: number;
      producto: string;
      motivo: string;
    }
    | null {
    let limpio = mensaje
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase()
      .replace(/[¿?¡!]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const match =
      /^(?:saca|sacame|retira|retirame|egresa|egresame|quita|quitame|descuenta|descontame)\s+(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(
        limpio,
      );

    if (!match) {
      return null;
    }

    const cantidad =
      Number(
        match[1].replace(
          ",",
          ".",
        ),
      );

    let resto =
      match[2].trim();

    let motivo = "";

    const indiceMotivo =
      resto.lastIndexOf(" por ");

    if (indiceMotivo >= 0) {
      motivo =
        resto
          .slice(
            indiceMotivo + 5,
          )
          .trim();

      resto =
        resto
          .slice(
            0,
            indiceMotivo,
          )
          .trim();
    }

    resto = resto
      .replace(
        /\s+(?:del|de el|de|en el|en)\s+(?:stock|inventario|existencias)\s*$/,
        "",
      )
      .replace(
        /^(?:unidades?|unidad)\s+(?:de\s+)?/,
        "",
      )
      .trim();

    if (
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      !resto ||
      !motivo
    ) {
      return null;
    }

    return {
      cantidad,
      producto: resto,
      motivo,
    };
  }

  private async crearAccionStockSalidaPendiente(
    vinculacion: UsuarioComercio,
    comercioId: string,
    borrador: StockSalidaPreparadoDrito,
  ): Promise<AccionDritoPersistida> {
    const expiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000,
      ).toISOString();

    const { data, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .insert({
          usuario_id:
            vinculacion.usuario_id,
          comercio_id:
            comercioId,
          tipo:
            "registrar_stock_salida",
          estado:
            "pendiente",
          payload:
            borrador,
          expires_at:
            expiresAt,
        })
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo preparar la confirmación segura de la salida de stock: ${error.message}`,
      );
    }

    return data as AccionDritoPersistida;
  }

  private async prepararSalidaStockDesdeMensaje(
    comercioId: string,
    vinculacion: UsuarioComercio,
    mensaje: string,
  ) {
    await this.exigirPermiso(
      vinculacion,
      "stock.registrar_egreso",
    );

    const pedido =
      this.extraerPedidoSalidaStock(
        mensaje,
      );

    if (!pedido) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.salida_incompleta",
        respuesta:
          "Para preparar una salida real necesito cantidad, producto y motivo. Probá, por ejemplo: “Sacá 2 cascos de seguridad del stock por muestra comercial”.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const { data, error } =
      await this.supabase.client
        .from("productos")
        .select(
          "id, tipo, codigo, nombre, descripcion, unidad_medida, controla_stock, stock_actual, activo",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq("activo", true)
        .eq("tipo", "producto")
        .eq(
          "controla_stock",
          true,
        )
        .limit(500);

    if (error) {
      throw error;
    }

    const productos =
      (data ??
        []) as Array<
          ProductoPreparacionVenta & {
            activo: boolean;
          }
        >;

    const productoElegido =
      this.elegirCoincidenciaUnica(
        pedido.producto,
        productos,
        (producto) => [
          producto.nombre,
          producto.codigo,
          producto.descripcion,
        ],
      );

    if (
      productoElegido.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.salida_producto_no_encontrado",
        respuesta:
          `No encontré un producto activo que administre stock y coincida con “${pedido.producto}” en esta empresa. No voy a descontar existencias de otro artículo por aproximación.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      productoElegido.estado ===
      "ambiguo"
    ) {
      const nombres =
        productoElegido.candidatos
          .map(
            (producto) =>
              producto.codigo
                ? `${producto.nombre} (${producto.codigo})`
                : producto.nombre,
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.salida_producto_ambiguo",
        respuesta:
          `Encontré más de un producto posible para “${pedido.producto}”: ${nombres}. Decime cuál querés retirar.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const producto =
      productoElegido.valor;

    const stockAntes =
      Math.round(
        Number(
          producto.stock_actual ?? 0,
        ) *
        1000,
      ) / 1000;

    const cantidad =
      Math.round(
        pedido.cantidad *
        1000,
      ) / 1000;

    if (
      cantidad >
      stockAntes
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.salida_stock_insuficiente",
        respuesta:
          `No preparé la salida porque ${producto.nombre} tiene ${stockAntes} ${producto.unidad_medida || "unidad"} disponibles y pediste retirar ${cantidad}. Drito no permite dejar el stock en negativo.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const stockDespuesEstimado =
      Math.round(
        (
          stockAntes -
          cantidad
        ) *
        1000,
      ) / 1000;

    const borrador:
      StockSalidaPreparadoDrito = {
      productoId:
        producto.id,
      productoNombre:
        producto.nombre,
      productoCodigo:
        producto.codigo,
      unidadMedida:
        producto.unidad_medida ||
        "unidad",

      tipo:
        "salida",
      cantidad,
      motivo:
        pedido.motivo,

      stockAntes,
      stockDespuesEstimado,
    };

    const accion =
      await this.crearAccionStockSalidaPendiente(
        vinculacion,
        comercioId,
        borrador,
      );

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "stock.salida_confirmacion_pendiente",
      respuesta:
        `La salida de stock está lista para confirmar: ${borrador.productoNombre}${borrador.productoCodigo ? ` (${borrador.productoCodigo})` : ""}. Cantidad: -${borrador.cantidad} ${borrador.unidadMedida}. Stock actual: ${borrador.stockAntes} → stock estimado: ${borrador.stockDespuesEstimado}. Motivo: ${borrador.motivo}. Si confirmás, Drito registrará un movimiento REAL de salida. No afectará Caja ni ARCA.`,
      acciones: [
        {
          id:
            `confirmar-stock-salida-${accion.id}`,
          tipo:
            "confirmar_stock_salida",
          label:
            "Confirmar salida real",
          accionId:
            accion.id,
          expiresAt:
            accion.expires_at,
          resumen:
            borrador,
        },
        {
          id:
            `ver-stock-salida-${producto.id}`,
          tipo:
            "navegar",
          label:
            "Revisar Stock",
          path:
            "/app/stock",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  private extraerPedidoIngresoStock(
    mensaje: string,
  ):
    | {
      cantidad: number;
      producto: string;
      motivo: string;
    }
    | null {
    let limpio = mensaje
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase()
      .replace(/[¿?¡!]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const match =
      /^(?:ingresa|ingresame|suma|sumame|carga|cargame|agrega|agregame|anade|anademe)\s+(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(
        limpio,
      );

    if (!match) {
      return null;
    }

    const cantidad =
      Number(
        match[1].replace(
          ",",
          ".",
        ),
      );

    let resto =
      match[2].trim();

    let motivo = "";

    const indiceMotivo =
      resto.lastIndexOf(" por ");

    if (indiceMotivo >= 0) {
      motivo =
        resto
          .slice(
            indiceMotivo + 5,
          )
          .trim();

      resto =
        resto
          .slice(
            0,
            indiceMotivo,
          )
          .trim();
    }

    resto = resto
      .replace(
        /\s+(?:al|a el|en el|en)\s+(?:stock|inventario|existencias)\s*$/,
        "",
      )
      .replace(
        /^(?:unidades?|unidad)\s+(?:de\s+)?/,
        "",
      )
      .trim();

    if (
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      !resto ||
      !motivo
    ) {
      return null;
    }

    return {
      cantidad,
      producto: resto,
      motivo,
    };
  }

  private async crearAccionStockPendiente(
    vinculacion: UsuarioComercio,
    comercioId: string,
    borrador: StockPreparadoDrito,
  ): Promise<AccionDritoPersistida> {
    const expiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000,
      ).toISOString();

    const { data, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .insert({
          usuario_id:
            vinculacion.usuario_id,
          comercio_id:
            comercioId,
          tipo:
            "registrar_stock",
          estado:
            "pendiente",
          payload:
            borrador,
          expires_at:
            expiresAt,
        })
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo preparar la confirmación segura del stock: ${error.message}`,
      );
    }

    return data as AccionDritoPersistida;
  }

  private async prepararIngresoStockDesdeMensaje(
    comercioId: string,
    vinculacion: UsuarioComercio,
    mensaje: string,
  ) {
    await this.exigirPermiso(
      vinculacion,
      "stock.registrar_ingreso",
    );

    const pedido =
      this.extraerPedidoIngresoStock(
        mensaje,
      );

    if (!pedido) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.ingreso_incompleto",
        respuesta:
          "Para preparar un ingreso real necesito cantidad, producto y motivo. Probá, por ejemplo: “Ingresá 3 cascos de seguridad al stock por reposición”.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const { data, error } =
      await this.supabase.client
        .from("productos")
        .select(
          "id, tipo, codigo, nombre, descripcion, unidad_medida, controla_stock, stock_actual, activo",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq("activo", true)
        .eq("tipo", "producto")
        .eq(
          "controla_stock",
          true,
        )
        .limit(500);

    if (error) {
      throw error;
    }

    const productos =
      (data ??
        []) as Array<
          ProductoPreparacionVenta & {
            activo: boolean;
          }
        >;

    const productoElegido =
      this.elegirCoincidenciaUnica(
        pedido.producto,
        productos,
        (producto) => [
          producto.nombre,
          producto.codigo,
          producto.descripcion,
        ],
      );

    if (
      productoElegido.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.ingreso_producto_no_encontrado",
        respuesta:
          `No encontré un producto activo que administre stock y coincida con “${pedido.producto}” en esta empresa. No voy a modificar otro artículo por aproximación.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      productoElegido.estado ===
      "ambiguo"
    ) {
      const nombres =
        productoElegido.candidatos
          .map(
            (producto) =>
              producto.codigo
                ? `${producto.nombre} (${producto.codigo})`
                : producto.nombre,
          )
          .join(", ");

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "stock.ingreso_producto_ambiguo",
        respuesta:
          `Encontré más de un producto posible para “${pedido.producto}”: ${nombres}. Decime cuál querés modificar.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const producto =
      productoElegido.valor;

    const stockAntes =
      Math.round(
        Number(
          producto.stock_actual ?? 0,
        ) *
        1000,
      ) / 1000;

    const cantidad =
      Math.round(
        pedido.cantidad *
        1000,
      ) / 1000;

    const stockDespuesEstimado =
      Math.round(
        (
          stockAntes +
          cantidad
        ) *
        1000,
      ) / 1000;

    const borrador:
      StockPreparadoDrito = {
      productoId:
        producto.id,
      productoNombre:
        producto.nombre,
      productoCodigo:
        producto.codigo,
      unidadMedida:
        producto.unidad_medida ||
        "unidad",

      tipo:
        "entrada",
      cantidad,
      motivo:
        pedido.motivo,

      stockAntes,
      stockDespuesEstimado,
    };

    const accion =
      await this.crearAccionStockPendiente(
        vinculacion,
        comercioId,
        borrador,
      );

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "stock.ingreso_confirmacion_pendiente",
      respuesta:
        `El ingreso de stock está listo para confirmar: ${borrador.productoNombre}${borrador.productoCodigo ? ` (${borrador.productoCodigo})` : ""}. Cantidad: +${borrador.cantidad} ${borrador.unidadMedida}. Stock actual: ${borrador.stockAntes} → stock estimado: ${borrador.stockDespuesEstimado}. Motivo: ${borrador.motivo}. Si confirmás, Drito registrará un movimiento REAL de entrada usando el circuito normal de Stock. No afectará Caja ni ARCA.`,
      acciones: [
        {
          id:
            `confirmar-stock-${accion.id}`,
          tipo:
            "confirmar_stock_ingreso",
          label:
            "Confirmar ingreso real",
          accionId:
            accion.id,
          expiresAt:
            accion.expires_at,
          resumen:
            borrador,
        },
        {
          id:
            `ver-stock-${producto.id}`,
          tipo:
            "navegar",
          label:
            "Revisar Stock",
          path:
            "/app/stock",
        },
      ] satisfies DritoAssistantAction[],
    };
  }

  private async crearAccionCobroPendiente(
    vinculacion: UsuarioComercio,
    comercioId: string,
    borrador: CobroPreparadoDrito,
  ): Promise<AccionDritoPersistida> {
    const expiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000,
      ).toISOString();

    const { data, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .insert({
          usuario_id:
            vinculacion.usuario_id,
          comercio_id:
            comercioId,
          tipo:
            "registrar_pago_venta",
          estado:
            "pendiente",
          payload:
            borrador,
          expires_at:
            expiresAt,
        })
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo preparar la confirmación segura del cobro: ${error.message}`,
      );
    }

    return data as AccionDritoPersistida;
  }

  private async prepararCobroDesdeMensaje(
    comercioId: string,
    vinculacion: UsuarioComercio,
    mensaje: string,
  ) {
    await this.exigirPermiso(
      vinculacion,
      "ventas.registrar_cobros",
    );

    const texto =
      this.normalizarTexto(mensaje);

    if (
      /\bretencion|retenciones\b/.test(
        texto,
      )
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.cobro_retenciones_no_disponible",
        respuesta:
          "En esta primera acción ejecutable de cobranzas puedo registrar dinero real, pero todavía no voy a cargar retenciones sufridas desde el chat. Para una cobranza con retenciones usá el formulario de Ventas hasta que habilitemos esa acción con su propia confirmación fuerte.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const pedido =
      this.extraerPedidoCobro(
        mensaje,
      );

    if (!pedido) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.cobro_incompleto",
        respuesta:
          "Para preparar un cobro necesito el importe, la venta y el medio de pago. Probá, por ejemplo: “Registrá un cobro de $50.000 en la VTA-000002 por transferencia”.",
        acciones: [] as DritoAssistantAction[],
      };
    }

    const { data, error } =
      await this.supabase.client
        .from("ventas")
        .select(`
          id,
          numero,
          cliente_id,
          total,
          total_pagado,
          estado,
          estado_pago,
          cliente:clientes (
            nombre,
            razon_social
          )
        `)
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "numero",
          pedido.numeroVenta,
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.cobro_venta_no_encontrada",
        respuesta:
          `No encontré la VTA-${String(
            pedido.numeroVenta,
          ).padStart(6, "0")} en la empresa activa. No voy a aplicar el cobro a otra venta.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const venta =
      data as unknown as VentaPreparacionCobro;

    if (
      venta.estado !== "confirmada"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.cobro_venta_no_confirmada",
        respuesta:
          `La VTA-${String(
            pedido.numeroVenta,
          ).padStart(6, "0")} no está confirmada y no puedo registrar un cobro sobre ella.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const totalVenta =
      Number(
        venta.total ?? 0,
      );

    const totalPagado =
      Number(
        venta.total_pagado ?? 0,
      );

    const saldoAntes =
      Math.max(
        0,
        Math.round(
          (
            totalVenta -
            totalPagado
          ) * 100,
        ) / 100,
      );

    if (
      venta.estado_pago === "pagada" ||
      saldoAntes <= 0
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.cobro_venta_pagada",
        respuesta:
          `La VTA-${String(
            pedido.numeroVenta,
          ).padStart(6, "0")} ya no tiene saldo pendiente.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      pedido.importe >
      saldoAntes
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.cobro_supera_saldo",
        respuesta:
          `No preparé el cobro porque ${this.formatearMoneda(
            pedido.importe,
          )} supera el saldo pendiente de ${this.formatearMoneda(
            saldoAntes,
          )} de la VTA-${String(
            pedido.numeroVenta,
          ).padStart(6, "0")}.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const saldoDespuesEstimado =
      Math.max(
        0,
        Math.round(
          (
            saldoAntes -
            pedido.importe
          ) * 100,
        ) / 100,
      );

    const estadoPagoEstimado:
      CobroPreparadoDrito["estadoPagoEstimado"] =
      saldoDespuesEstimado <= 0
        ? "pagada"
        : pedido.importe > 0
          ? "parcial"
          : "pendiente";

    const clienteRelacion =
      this.obtenerClienteRelacion(
        venta.cliente,
      );

    const clienteNombre =
      clienteRelacion?.razon_social?.trim() ||
      clienteRelacion?.nombre?.trim() ||
      "Cliente sin nombre";

    const borrador:
      CobroPreparadoDrito = {
      fechaPago:
        this.fechaActualArgentina(),

      ventaId:
        venta.id,
      numeroVenta:
        Number(venta.numero),
      clienteNombre,

      importe:
        pedido.importe,
      medioPago:
        pedido.medioPago,
      medioPagoLabel:
        pedido.medioPagoLabel,

      referencia: null,
      observaciones:
        "Cobro confirmado desde Drito Chat",

      totalVenta,
      saldoAntes,
      saldoDespuesEstimado,
      estadoPagoEstimado,
    };

    const accion =
      await this.crearAccionCobroPendiente(
        vinculacion,
        comercioId,
        borrador,
      );

    const estadoTexto =
      estadoPagoEstimado === "pagada"
        ? "Pagada"
        : "Pago parcial";

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "ventas.cobro_confirmacion_pendiente",
      respuesta:
        `El cobro está listo para confirmar: VTA-${String(
          borrador.numeroVenta,
        ).padStart(6, "0")} · ${borrador.clienteNombre}. Importe: ${this.formatearMoneda(
          borrador.importe,
        )} por ${borrador.medioPagoLabel}. Saldo actual: ${this.formatearMoneda(
          borrador.saldoAntes,
        )} → saldo estimado: ${this.formatearMoneda(
          borrador.saldoDespuesEstimado,
        )}. Estado estimado: ${estadoTexto}. Si confirmás, Drito registrará un cobro REAL y Caja recibirá el ingreso por el circuito normal. No emitirá factura ARCA.`,
      acciones: [
        {
          id:
            `confirmar-cobro-${accion.id}`,
          tipo:
            "confirmar_cobro",
          label:
            "Confirmar cobro real",
          accionId:
            accion.id,
          expiresAt:
            accion.expires_at,
          resumen:
            borrador,
        },
        {
          id:
            `ver-venta-cobro-${venta.id}`,
          tipo:
            "navegar",
          label:
            "Revisar ventas",
          path:
            "/app/ventas",
        },
      ] satisfies DritoAssistantAction[],
    };
  }

  private async crearAccionVentaPendiente(
    vinculacion: UsuarioComercio,
    comercioId: string,
    borrador: VentaPreparadaDrito,
  ): Promise<AccionDritoPersistida> {
    const expiresAt =
      new Date(
        Date.now() +
        10 * 60 * 1000,
      ).toISOString();

    const { data, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .insert({
          usuario_id:
            vinculacion.usuario_id,
          comercio_id:
            comercioId,
          tipo:
            "crear_venta",
          estado:
            "pendiente",
          payload:
            borrador,
          expires_at:
            expiresAt,
        })
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .single();

    if (error) {
      throw new BadRequestException(
        `No se pudo preparar la confirmación segura de la venta: ${error.message}`,
      );
    }

    return data as AccionDritoPersistida;
  }

  private obtenerConfiguracionSupabase(): {
    url: string;
    serviceRoleKey: string;
  } {
    const url =
      this.config.get<string>(
        "SUPABASE_URL",
      );

    const serviceRoleKey =
      this.config.get<string>(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    if (!url || !serviceRoleKey) {
      throw new Error(
        "Falta configuración interna de Supabase en backend-arca.",
      );
    }

    return {
      url: url.replace(/\/$/, ""),
      serviceRoleKey,
    };
  }

  private async ejecutarRpcComoUsuario(
    accessToken: string,
    funcion: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const {
      url,
      serviceRoleKey,
    } =
      this.obtenerConfiguracionSupabase();

    const response =
      await fetch(
        `${url}/rest/v1/rpc/${funcion}`,
        {
          method: "POST",
          headers: {
            apikey:
              serviceRoleKey,
            Authorization:
              `Bearer ${accessToken}`,
            Accept:
              "application/json",
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(body),
        },
      );

    let data: unknown = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const errorData =
        (
          typeof data === "object" &&
          data !== null
        )
          ? data as Record<
            string,
            unknown
          >
          : null;

      const mensaje =
        typeof errorData?.message ===
          "string"
          ? errorData.message
          : typeof errorData?.details ===
            "string"
            ? errorData.details
            : `Supabase respondió HTTP ${response.status}.`;

      throw new BadRequestException(
        mensaje,
      );
    }

    return data;
  }

  async confirmarVentaPreparada(
    user: AuthUser,
    comercioId: string,
    accionId: string,
    accessToken: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "ventas.crear",
    );

    const { data: accion, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .eq("id", accionId)
        .eq(
          "usuario_id",
          user.id,
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!accion) {
      throw new NotFoundException(
        "La confirmación de Drito no existe o no pertenece a esta empresa.",
      );
    }

    const resultadoRpc =
      await this.ejecutarRpcComoUsuario(
        accessToken,
        "confirmar_accion_drito_crear_venta",
        {
          p_accion_id:
            accionId,
        },
      );

    const fila =
      Array.isArray(resultadoRpc)
        ? resultadoRpc[0]
        : resultadoRpc;

    if (
      !fila ||
      typeof fila !== "object"
    ) {
      throw new BadRequestException(
        "La venta fue procesada, pero Drito no recibió un resultado válido.",
      );
    }

    const resultado =
      fila as unknown as ResultadoConfirmarVentaDrito;

    const numeroVenta =
      Number(
        resultado.numero_venta,
      );

    const totalVenta =
      Number(
        resultado.total_venta,
      );

    const saldoPendiente =
      Number(
        resultado.saldo_pendiente,
      );

    const stockPosterior =
      resultado.stock_posterior ===
        null
        ? null
        : Number(
          resultado.stock_posterior,
        );

    const numeroFormateado =
      Number.isFinite(numeroVenta)
        ? `VTA-${String(
          numeroVenta,
        ).padStart(6, "0")}`
        : "la venta";

    const stockTexto =
      stockPosterior === null
        ? ""
        : ` Stock posterior: ${stockPosterior}.`;

    return {
      ok: true,
      soloLectura: false,
      intencion:
        "ventas.creada_confirmada",
      respuesta:
        `${numeroFormateado} fue creada correctamente por Drito con confirmación explícita. Total: ${this.formatearMoneda(totalVenta)}. Saldo pendiente: ${this.formatearMoneda(saldoPendiente)}.${stockTexto}${resultado.idempotente ? " Esta confirmación ya había sido procesada; no se duplicó la venta." : ""}`,
      resultado: {
        accionId:
          resultado.accion_id,
        ventaId:
          resultado.venta_id,
        numeroVenta,
        totalVenta,
        saldoPendiente,
        estadoPago:
          resultado.estado_pago,
        stockPosterior,
        idempotente:
          Boolean(
            resultado.idempotente,
          ),
      },
      acciones: [
        {
          id:
            `ver-ventas-${resultado.venta_id}`,
          tipo:
            "navegar",
          label:
            "Ver ventas",
          path:
            "/app/ventas",
        },
      ] satisfies DritoAssistantAction[],
    };
  }








  async confirmarCompraPreparada(
    user: AuthUser,
    comercioId: string,
    accionId: string,
    accessToken: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "compras.crear",
    );

    const {
      data: accion,
      error,
    } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .eq(
          "id",
          accionId,
        )
        .eq(
          "usuario_id",
          user.id,
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!accion) {
      throw new NotFoundException(
        "La confirmación de compra no existe o no pertenece a esta empresa.",
      );
    }

    const resultadoRpc =
      await this.ejecutarRpcComoUsuario(
        accessToken,
        "confirmar_accion_drito_crear_compra",
        {
          p_accion_id:
            accionId,
        },
      );

    const fila =
      Array.isArray(
        resultadoRpc,
      )
        ? resultadoRpc[0]
        : resultadoRpc;

    if (
      !fila ||
      typeof fila !==
      "object"
    ) {
      throw new BadRequestException(
        "La compra fue procesada, pero Drito no recibió un resultado válido.",
      );
    }

    const resultado =
      fila as unknown as
      ResultadoConfirmarCompraDrito;

    const numeroCompra =
      Number(
        resultado.numero_compra,
      );

    const totalCompra =
      Number(
        resultado.total_compra,
      );

    const cantidad =
      Number(
        resultado.cantidad,
      );

    const costoUnitario =
      Number(
        resultado.costo_unitario,
      );

    const stockAnterior =
      resultado.stock_anterior ===
        null
        ? null
        : Number(
          resultado.stock_anterior,
        );

    const stockPosterior =
      resultado.stock_posterior ===
        null
        ? null
        : Number(
          resultado.stock_posterior,
        );

    const saldoProveedorAnterior =
      Number(
        resultado.saldo_proveedor_anterior,
      );

    const saldoProveedorFinal =
      Number(
        resultado.saldo_proveedor_final,
      );

    const stockTexto =
      stockAnterior !==
        null &&
        stockPosterior !==
        null
        ? ` Stock: ${stockAnterior} → ${stockPosterior}.`
        : "";

    return {
      ok: true,
      soloLectura: false,
      intencion:
        "compras.registro_confirmado",
      respuesta:
        `COM-${String(
          numeroCompra,
        ).padStart(
          6,
          "0",
        )} fue registrada correctamente por Drito para ${resultado.proveedor_nombre}. ${cantidad} × ${resultado.producto_nombre} a ${this.formatearMoneda(
          costoUnitario,
        )}. Total: ${this.formatearMoneda(
          totalCompra,
        )}.${stockTexto} Cuenta del proveedor: ${this.formatearMoneda(
          saldoProveedorAnterior,
        )} → ${this.formatearMoneda(
          saldoProveedorFinal,
        )}. La compra quedó pendiente de pago; Caja no se modificó.${resultado.idempotente ? " Esta confirmación ya había sido procesada; no se duplicó la compra." : ""}`,
      resultado: {
        accionId:
          resultado.accion_id,
        compraId:
          resultado.compra_id,
        numeroCompra,
        proveedorId:
          resultado.proveedor_id,
        proveedorNombre:
          resultado.proveedor_nombre,
        productoId:
          resultado.producto_id,
        productoNombre:
          resultado.producto_nombre,
        cantidad,
        costoUnitario,
        ivaTratamiento:
          resultado.iva_tratamiento,
        ivaPorcentaje:
          Number(
            resultado.iva_porcentaje,
          ),
        ivaAlicuotaCodigo:
          resultado.iva_alicuota_codigo ===
            null
            ? null
            : Number(
              resultado.iva_alicuota_codigo,
            ),
        totalComercial:
          Number(
            resultado.total_comercial,
          ),
        totalCompra,
        movimientosGenerados:
          Number(
            resultado.movimientos_generados,
          ),
        cantidadTotalIngresada:
          Number(
            resultado.cantidad_total_ingresada,
          ),
        stockAnterior,
        stockPosterior,
        saldoProveedorAnterior,
        saldoProveedorFinal,
        idempotente:
          Boolean(
            resultado.idempotente,
          ),
      },
      acciones: [
        {
          id:
            `ver-compras-${resultado.compra_id}`,
          tipo:
            "navegar",
          label:
            "Ver Compras",
          path:
            "/app/compras",
        },
        {
          id:
            `ver-stock-compra-${resultado.compra_id}`,
          tipo:
            "navegar",
          label:
            "Ver Stock",
          path:
            "/app/stock",
        },
        {
          id:
            `ver-cuenta-proveedor-compra-${resultado.compra_id}`,
          tipo:
            "navegar",
          label:
            "Ver cuenta proveedor",
          path:
            "/app/cuentas-corrientes/proveedores",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  async confirmarPagoProveedorPreparado(
    user: AuthUser,
    comercioId: string,
    accionId: string,
    accessToken: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "cuentas_proveedores.registrar_pagos",
    );

    const { data: accion, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .eq("id", accionId)
        .eq(
          "usuario_id",
          user.id,
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!accion) {
      throw new NotFoundException(
        "La confirmación del pago a proveedor no existe o no pertenece a esta empresa.",
      );
    }

    const resultadoRpc =
      await this.ejecutarRpcComoUsuario(
        accessToken,
        "confirmar_accion_drito_registrar_pago_proveedor",
        {
          p_accion_id:
            accionId,
        },
      );

    const fila =
      Array.isArray(resultadoRpc)
        ? resultadoRpc[0]
        : resultadoRpc;

    if (
      !fila ||
      typeof fila !== "object"
    ) {
      throw new BadRequestException(
        "El pago fue procesado, pero Drito no recibió un resultado válido.",
      );
    }

    const resultado =
      fila as unknown as ResultadoConfirmarPagoProveedorDrito;

    const importe =
      Number(
        resultado.importe_pagado,
      );

    const saldoAnterior =
      Number(
        resultado.saldo_anterior,
      );

    const saldoFinal =
      Number(
        resultado.saldo_final,
      );

    const comprasAfectadas =
      Number(
        resultado.compras_afectadas,
      );

    return {
      ok: true,
      soloLectura: false,
      intencion:
        "cuentas_proveedores.pago_registrado_confirmado",
      respuesta:
        `${resultado.comprobante} fue registrado correctamente por Drito para ${resultado.nombre_proveedor}. Importe: ${this.formatearMoneda(
          importe,
        )}. Saldo: ${this.formatearMoneda(
          saldoAnterior,
        )} → ${this.formatearMoneda(
          saldoFinal,
        )}. ${comprasAfectadas} ${this.plural(
          comprasAfectadas,
          "compra afectada",
          "compras afectadas",
        )}. Caja registró el egreso correspondiente.${resultado.idempotente ? " Esta confirmación ya había sido procesada; no se duplicó el pago." : ""}`,
      resultado: {
        accionId:
          resultado.accion_id,
        pagoProveedorId:
          resultado.pago_proveedor_id,
        numeroPagoProveedor:
          Number(
            resultado.numero_pago_proveedor,
          ),
        comprobante:
          resultado.comprobante,
        proveedorId:
          resultado.proveedor_id,
        nombreProveedor:
          resultado.nombre_proveedor,
        importePagado:
          importe,
        comprasAfectadas,
        pagosGenerados:
          Number(
            resultado.pagos_generados,
          ),
        saldoAnterior,
        saldoFinal,
        movimientoCajaId:
          resultado.movimiento_caja_id,
        idempotente:
          Boolean(
            resultado.idempotente,
          ),
      },
      acciones: [
        {
          id:
            `ver-cuenta-proveedor-${resultado.proveedor_id}`,
          tipo: "navegar",
          label:
            "Ver cuenta proveedor",
          path:
            "/app/cuentas-corrientes/proveedores",
        },
        {
          id:
            `ver-caja-pago-proveedor-${resultado.pago_proveedor_id}`,
          tipo: "navegar",
          label:
            "Ver Caja",
          path:
            "/app/caja",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  async confirmarGastoPreparado(
    user: AuthUser,
    comercioId: string,
    accionId: string,
    accessToken: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "gastos.registrar",
    );

    const { data: accion, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .eq("id", accionId)
        .eq(
          "usuario_id",
          user.id,
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!accion) {
      throw new NotFoundException(
        "La confirmación del gasto no existe o no pertenece a esta empresa.",
      );
    }

    const resultadoRpc =
      await this.ejecutarRpcComoUsuario(
        accessToken,
        "confirmar_accion_drito_registrar_gasto",
        {
          p_accion_id:
            accionId,
        },
      );

    const fila =
      Array.isArray(resultadoRpc)
        ? resultadoRpc[0]
        : resultadoRpc;

    if (
      !fila ||
      typeof fila !== "object"
    ) {
      throw new BadRequestException(
        "El gasto fue procesado, pero Drito no recibió un resultado válido.",
      );
    }

    const resultado =
      fila as unknown as ResultadoConfirmarGastoDrito;

    const numero =
      Number(
        resultado.numero,
      );

    const importe =
      Number(
        resultado.importe,
      );

    return {
      ok: true,
      soloLectura: false,
      intencion:
        "gastos.registro_confirmado",
      respuesta:
        `${resultado.comprobante || `GTO-${String(numero).padStart(6, "0")}`} fue registrado correctamente por Drito. Categoría: ${resultado.categoria_nombre}. Concepto: ${resultado.concepto}. Importe: ${this.formatearMoneda(
          importe,
        )}. Medio: ${this.formatearMedioPagoGasto(
          resultado.medio_pago,
        )}. Caja registró el egreso correspondiente.${resultado.idempotente ? " Esta confirmación ya había sido procesada; no se duplicó el gasto." : ""}`,
      resultado: {
        accionId:
          resultado.accion_id,
        gastoId:
          resultado.gasto_id,
        numero,
        comprobante:
          resultado.comprobante,
        fechaGasto:
          resultado.fecha_gasto,
        categoriaId:
          resultado.categoria_id,
        categoriaNombre:
          resultado.categoria_nombre,
        concepto:
          resultado.concepto,
        beneficiario:
          resultado.beneficiario,
        importe,
        medioPago:
          resultado.medio_pago,
        referencia:
          resultado.referencia,
        observaciones:
          resultado.observaciones,
        estado:
          resultado.estado,
        movimientoCajaId:
          resultado.movimiento_caja_id,
        idempotente:
          Boolean(
            resultado.idempotente,
          ),
      },
      acciones: [
        {
          id:
            `ver-gastos-${resultado.gasto_id}`,
          tipo:
            "navegar",
          label:
            "Ver Gastos",
          path:
            "/app/gastos",
        },
        {
          id:
            `ver-caja-gasto-${resultado.gasto_id}`,
          tipo:
            "navegar",
          label:
            "Ver Caja",
          path:
            "/app/caja",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  async confirmarStockAjustePreparado(
    user: AuthUser,
    comercioId: string,
    accionId: string,
    accessToken: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "stock.ajustar",
    );

    const { data: accion, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .eq("id", accionId)
        .eq(
          "usuario_id",
          user.id,
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!accion) {
      throw new NotFoundException(
        "La confirmación de ajuste de stock no existe o no pertenece a esta empresa.",
      );
    }

    const resultadoRpc =
      await this.ejecutarRpcComoUsuario(
        accessToken,
        "confirmar_accion_drito_ajustar_stock",
        {
          p_accion_id:
            accionId,
        },
      );

    const fila =
      Array.isArray(resultadoRpc)
        ? resultadoRpc[0]
        : resultadoRpc;

    if (
      !fila ||
      typeof fila !== "object"
    ) {
      throw new BadRequestException(
        "El ajuste fue procesado, pero Drito no recibió un resultado válido.",
      );
    }

    const resultado =
      fila as unknown as ResultadoConfirmarStockAjusteDrito;

    const cantidad =
      Number(
        resultado.cantidad,
      );

    const diferencia =
      Number(
        resultado.diferencia,
      );

    const stockAnterior =
      Number(
        resultado.stock_anterior,
      );

    const stockObjetivo =
      Number(
        resultado.stock_objetivo,
      );

    const stockPosterior =
      Number(
        resultado.stock_posterior,
      );

    const signo =
      diferencia > 0
        ? "+"
        : "";

    return {
      ok: true,
      soloLectura: false,
      intencion:
        "stock.ajuste_registrado_confirmado",
      respuesta:
        `Ajuste de stock registrado correctamente por Drito: ${resultado.producto_nombre}. Stock: ${stockAnterior} → ${stockPosterior}. Diferencia: ${signo}${diferencia}. Motivo: ${resultado.motivo}.${resultado.idempotente ? " Esta confirmación ya había sido procesada; no se duplicó el ajuste." : ""}`,
      resultado: {
        accionId:
          resultado.accion_id,
        movimientoId:
          resultado.movimiento_id,
        productoId:
          resultado.producto_id,
        productoNombre:
          resultado.producto_nombre,
        tipoMovimiento:
          resultado.tipo_movimiento,
        cantidad,
        diferencia,
        stockAnterior,
        stockObjetivo,
        stockPosterior,
        motivo:
          resultado.motivo,
        idempotente:
          Boolean(
            resultado.idempotente,
          ),
      },
      acciones: [
        {
          id:
            `ver-stock-ajuste-${resultado.accion_id}`,
          tipo:
            "navegar",
          label:
            "Ver Stock",
          path:
            "/app/stock",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  async confirmarStockSalidaPreparada(
    user: AuthUser,
    comercioId: string,
    accionId: string,
    accessToken: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "stock.registrar_egreso",
    );

    const { data: accion, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .eq("id", accionId)
        .eq(
          "usuario_id",
          user.id,
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!accion) {
      throw new NotFoundException(
        "La confirmación de salida de stock no existe o no pertenece a esta empresa.",
      );
    }

    const resultadoRpc =
      await this.ejecutarRpcComoUsuario(
        accessToken,
        "confirmar_accion_drito_registrar_stock_salida",
        {
          p_accion_id:
            accionId,
        },
      );

    const fila =
      Array.isArray(resultadoRpc)
        ? resultadoRpc[0]
        : resultadoRpc;

    if (
      !fila ||
      typeof fila !== "object"
    ) {
      throw new BadRequestException(
        "La salida fue procesada, pero Drito no recibió un resultado válido.",
      );
    }

    const resultado =
      fila as unknown as ResultadoConfirmarStockSalidaDrito;

    const cantidad =
      Number(
        resultado.cantidad,
      );

    const stockAnterior =
      Number(
        resultado.stock_anterior,
      );

    const stockPosterior =
      Number(
        resultado.stock_posterior,
      );

    return {
      ok: true,
      soloLectura: false,
      intencion:
        "stock.salida_registrada_confirmada",
      respuesta:
        `Salida de stock registrada correctamente por Drito: ${resultado.producto_nombre}, -${cantidad}. Stock: ${stockAnterior} → ${stockPosterior}. Motivo: ${resultado.motivo}.${resultado.idempotente ? " Esta confirmación ya había sido procesada; no se duplicó el movimiento." : ""}`,
      resultado: {
        accionId:
          resultado.accion_id,
        movimientoId:
          resultado.movimiento_id,
        productoId:
          resultado.producto_id,
        productoNombre:
          resultado.producto_nombre,
        tipoMovimiento:
          resultado.tipo_movimiento,
        cantidad,
        stockAnterior,
        stockPosterior,
        motivo:
          resultado.motivo,
        idempotente:
          Boolean(
            resultado.idempotente,
          ),
      },
      acciones: [
        {
          id:
            `ver-stock-salida-${resultado.accion_id}`,
          tipo:
            "navegar",
          label:
            "Ver Stock",
          path:
            "/app/stock",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  async confirmarStockPreparado(
    user: AuthUser,
    comercioId: string,
    accionId: string,
    accessToken: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "stock.registrar_ingreso",
    );

    const { data: accion, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .eq("id", accionId)
        .eq(
          "usuario_id",
          user.id,
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!accion) {
      throw new NotFoundException(
        "La confirmación de stock no existe o no pertenece a esta empresa.",
      );
    }

    const resultadoRpc =
      await this.ejecutarRpcComoUsuario(
        accessToken,
        "confirmar_accion_drito_registrar_stock",
        {
          p_accion_id:
            accionId,
        },
      );

    const fila =
      Array.isArray(resultadoRpc)
        ? resultadoRpc[0]
        : resultadoRpc;

    if (
      !fila ||
      typeof fila !== "object"
    ) {
      throw new BadRequestException(
        "El movimiento fue procesado, pero Drito no recibió un resultado válido.",
      );
    }

    const resultado =
      fila as unknown as ResultadoConfirmarStockDrito;

    const cantidad =
      Number(
        resultado.cantidad,
      );

    const stockAnterior =
      Number(
        resultado.stock_anterior,
      );

    const stockPosterior =
      Number(
        resultado.stock_posterior,
      );

    return {
      ok: true,
      soloLectura: false,
      intencion:
        "stock.ingreso_registrado_confirmado",
      respuesta:
        `Ingreso de stock registrado correctamente por Drito: ${resultado.producto_nombre}, +${cantidad}. Stock: ${stockAnterior} → ${stockPosterior}. Motivo: ${resultado.motivo}.${resultado.idempotente ? " Esta confirmación ya había sido procesada; no se duplicó el movimiento." : ""}`,
      resultado: {
        accionId:
          resultado.accion_id,
        movimientoId:
          resultado.movimiento_id,
        productoId:
          resultado.producto_id,
        productoNombre:
          resultado.producto_nombre,
        tipoMovimiento:
          resultado.tipo_movimiento,
        cantidad,
        stockAnterior,
        stockPosterior,
        motivo:
          resultado.motivo,
        idempotente:
          Boolean(
            resultado.idempotente,
          ),
      },
      acciones: [
        {
          id:
            `ver-stock-movimiento-${resultado.accion_id}`,
          tipo:
            "navegar",
          label:
            "Ver Stock",
          path:
            "/app/stock",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  async confirmarCobroPreparado(
    user: AuthUser,
    comercioId: string,
    accionId: string,
    accessToken: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "ventas.registrar_cobros",
    );

    const { data: accion, error } =
      await this.supabase.client
        .from(
          "drito_asistente_acciones",
        )
        .select(
          "id, usuario_id, comercio_id, tipo, estado, payload, resultado, expires_at",
        )
        .eq("id", accionId)
        .eq(
          "usuario_id",
          user.id,
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message,
      );
    }

    if (!accion) {
      throw new NotFoundException(
        "La confirmación del cobro no existe o no pertenece a esta empresa.",
      );
    }

    const resultadoRpc =
      await this.ejecutarRpcComoUsuario(
        accessToken,
        "confirmar_accion_drito_registrar_pago",
        {
          p_accion_id:
            accionId,
        },
      );

    const fila =
      Array.isArray(resultadoRpc)
        ? resultadoRpc[0]
        : resultadoRpc;

    if (
      !fila ||
      typeof fila !== "object"
    ) {
      throw new BadRequestException(
        "El cobro fue procesado, pero Drito no recibió un resultado válido.",
      );
    }

    const resultado =
      fila as unknown as ResultadoConfirmarCobroDrito;

    const numeroPago =
      Number(
        resultado.numero_pago,
      );

    const numeroVenta =
      Number(
        resultado.numero_venta,
      );

    const importe =
      Number(
        resultado.importe,
      );

    const totalPagado =
      Number(
        resultado.total_pagado,
      );

    const saldoPendiente =
      Number(
        resultado.saldo_pendiente,
      );

    const pagoFormateado =
      Number.isFinite(numeroPago)
        ? `PAG-${String(
          numeroPago,
        ).padStart(6, "0")}`
        : "El cobro";

    const ventaFormateada =
      Number.isFinite(numeroVenta)
        ? `VTA-${String(
          numeroVenta,
        ).padStart(6, "0")}`
        : "la venta";

    const estadoTexto =
      resultado.estado_pago === "pagada"
        ? "Pagada"
        : resultado.estado_pago === "parcial"
          ? "Pago parcial"
          : "Pendiente";

    const cajaTexto =
      resultado.movimiento_caja_id
        ? " Caja recibió el ingreso correspondiente."
        : " El cobro fue registrado; no pude identificar el movimiento de Caja en la respuesta.";

    return {
      ok: true,
      soloLectura: false,
      intencion:
        "ventas.cobro_registrado_confirmado",
      respuesta:
        `${pagoFormateado} fue registrado correctamente por Drito sobre ${ventaFormateada} con confirmación explícita. Importe: ${this.formatearMoneda(
          importe,
        )}. Total cancelado: ${this.formatearMoneda(
          totalPagado,
        )}. Saldo pendiente: ${this.formatearMoneda(
          saldoPendiente,
        )}. Estado: ${estadoTexto}.${cajaTexto}${resultado.idempotente ? " Esta confirmación ya había sido procesada; no se duplicó el cobro." : ""}`,
      resultado: {
        accionId:
          resultado.accion_id,
        pagoId:
          resultado.pago_id,
        numeroPago,
        ventaId:
          resultado.venta_id,
        numeroVenta,
        importe,
        totalPagado,
        saldoPendiente,
        estadoPago:
          resultado.estado_pago,
        movimientoCajaId:
          resultado.movimiento_caja_id,
        idempotente:
          Boolean(
            resultado.idempotente,
          ),
      },
      acciones: [
        {
          id:
            `ver-ventas-cobro-${resultado.pago_id}`,
          tipo:
            "navegar",
          label:
            "Ver ventas",
          path:
            "/app/ventas",
        },
        {
          id:
            `ver-caja-cobro-${resultado.pago_id}`,
          tipo:
            "navegar",
          label:
            "Ver Caja",
          path:
            "/app/caja",
        },
      ] satisfies DritoAssistantAction[],
    };
  }


  private obtenerClienteRelacion(
    valor:
      | ClienteVentaRelacion
      | ClienteVentaRelacion[]
      | null,
  ): ClienteVentaRelacion | null {
    if (!valor) {
      return null;
    }

    if (Array.isArray(valor)) {
      return valor[0] ?? null;
    }

    return valor;
  }

  private async obtenerVinculacionActiva(
    userId: string,
    comercioId: string,
  ): Promise<UsuarioComercio> {
    const { data, error } = await this.supabase.client
      .from("usuarios_comercios")
      .select(
        "id, usuario_id, comercio_id, rol, cargo, activo",
      )
      .eq("usuario_id", userId)
      .eq("comercio_id", comercioId)
      .eq("activo", true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new ForbiddenException(
        "El usuario no posee acceso activo a esta empresa.",
      );
    }

    /*
     * 21A.6.5c:
     * Este servicio usa el cliente administrativo de Supabase y por
     * eso no debe depender solamente de RLS. Revalidamos explícitamente
     * que tanto la empresa como su Cuenta Drito sigan activas.
     */
    const {
      data: comercio,
      error: errorComercio,
    } = await this.supabase.client
      .from("comercios")
      .select("id, activo, cuenta_drito_id")
      .eq("id", comercioId)
      .maybeSingle();

    if (errorComercio) {
      throw errorComercio;
    }

    if (
      !comercio ||
      comercio.activo !== true ||
      !comercio.cuenta_drito_id
    ) {
      throw new ForbiddenException(
        "La empresa no se encuentra activa en Drito.",
      );
    }

    const {
      data: cuentaDrito,
      error: errorCuentaDrito,
    } = await this.supabase.client
      .from("cuentas_drito")
      .select("id, activo")
      .eq("id", comercio.cuenta_drito_id)
      .maybeSingle();

    if (errorCuentaDrito) {
      throw errorCuentaDrito;
    }

    if (
      !cuentaDrito ||
      cuentaDrito.activo !== true
    ) {
      throw new ForbiddenException(
        "La Cuenta Drito se encuentra deshabilitada.",
      );
    }

    return data as UsuarioComercio;
  }

  private async permisoHabilitado(
    vinculacion: UsuarioComercio,
    codigo: string,
  ): Promise<boolean> {
    if (vinculacion.rol === "admin") {
      return true;
    }

    const {
      data: personalizado,
      error: errorPersonalizado,
    } = await this.supabase.client
      .from("usuarios_permisos")
      .select("permitido")
      .eq("usuario_comercio_id", vinculacion.id)
      .eq("permiso_codigo", codigo)
      .maybeSingle();

    if (errorPersonalizado) {
      throw errorPersonalizado;
    }

    if (personalizado) {
      return personalizado.permitido === true;
    }

    const {
      data: permisoRol,
      error: errorRol,
    } = await this.supabase.client
      .from("roles_permisos")
      .select("permitido")
      .eq("rol", vinculacion.rol)
      .eq("permiso_codigo", codigo)
      .maybeSingle();

    if (errorRol) {
      throw errorRol;
    }

    return permisoRol?.permitido === true;
  }

  private async exigirPermiso(
    vinculacion: UsuarioComercio,
    codigo: string,
  ): Promise<void> {
    const permitido =
      await this.permisoHabilitado(
        vinculacion,
        codigo,
      );

    if (!permitido) {
      throw new ForbiddenException(
        `El usuario no posee el permiso ${codigo} en esta empresa.`,
      );
    }
  }

  private async obtenerPermisosHabilitados(
    vinculacion: UsuarioComercio,
  ): Promise<string[]> {
    const { data: catalogo, error: errorCatalogo } =
      await this.supabase.client
        .from("permisos_sistema")
        .select("codigo, activo, orden")
        .eq("activo", true)
        .order("orden", { ascending: true });

    if (errorCatalogo) {
      throw errorCatalogo;
    }

    const habilitados: string[] = [];

    for (const permiso of catalogo ?? []) {
      const permitido =
        await this.permisoHabilitado(
          vinculacion,
          permiso.codigo,
        );

      if (permitido) {
        habilitados.push(permiso.codigo);
      }
    }

    return habilitados;
  }

  private rangoMesActualArgentina(): {
    desde: string;
    hastaExclusivo: string;
    etiqueta: string;
  } {
    const ahora = new Date();

    const partes = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(ahora);

    const year = Number(
      partes.find((p) => p.type === "year")
        ?.value,
    );

    const month = Number(
      partes.find((p) => p.type === "month")
        ?.value,
    );

    const desde =
      `${year}-${String(month).padStart(2, "0")}-01`;

    const nextYear =
      month === 12 ? year + 1 : year;

    const nextMonth =
      month === 12 ? 1 : month + 1;

    const hastaExclusivo =
      `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const etiqueta = new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        month: "long",
        year: "numeric",
      },
    ).format(ahora);

    return {
      desde,
      hastaExclusivo,
      etiqueta,
    };
  }


  private rangoCajaMesActualArgentina(): {
    desde: string;
    hasta: string;
    etiqueta: string;
  } {
    const ahora = new Date();

    const partes = new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(ahora);

    const year = Number(
      partes.find((p) => p.type === "year")
        ?.value,
    );

    const month = Number(
      partes.find((p) => p.type === "month")
        ?.value,
    );

    const day = Number(
      partes.find((p) => p.type === "day")
        ?.value,
    );

    const desde =
      `${year}-${String(month).padStart(2, "0")}-01`;

    const hasta =
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const etiqueta = new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        month: "long",
        year: "numeric",
      },
    ).format(ahora);

    return {
      desde,
      hasta,
      etiqueta,
    };
  }

  private respuestaResumenVentas(
    resumen: ResumenVentasMes,
    preguntaNormalizada: string,
  ): string {
    const { metricas, periodo } = resumen;

    const vendido =
      this.formatearMoneda(
        metricas.totalVendido,
      );

    const cobrado =
      this.formatearMoneda(
        metricas.totalCobrado,
      );

    const pendiente =
      this.formatearMoneda(
        metricas.saldoPendiente,
      );

    if (
      preguntaNormalizada.includes("pendient") ||
      preguntaNormalizada.includes("falta cobrar") ||
      preguntaNormalizada.includes("saldo")
    ) {
      return (
        `En ${periodo.etiqueta} te quedan ${pendiente} por cobrar. ` +
        `Cobraste ${cobrado} sobre ${vendido} vendidos. ` +
        `Tenés ${metricas.ventasPendientes} ` +
        `${this.plural(
          metricas.ventasPendientes,
          "venta con saldo pendiente",
          "ventas con saldo pendiente",
        )}.`
      );
    }

    if (
      preguntaNormalizada.includes("cobr")
    ) {
      return (
        `En ${periodo.etiqueta} cobraste ${cobrado}. ` +
        `El total vendido es ${vendido} y quedan ${pendiente} pendientes de cobro.`
      );
    }

    return (
      `En ${periodo.etiqueta} llevás ${vendido} en ventas. ` +
      `Cobraste ${cobrado} y quedan ${pendiente} pendientes de cobro. ` +
      `Son ${metricas.cantidadVentas} ` +
      `${this.plural(
        metricas.cantidadVentas,
        "venta confirmada",
        "ventas confirmadas",
      )}.`
    );
  }

  private respuestaClientesConDeuda(
    resumen: ResumenClientesConDeuda,
  ): string {
    const { metricas, clientes } = resumen;

    if (metricas.clientesConDeuda === 0) {
      return (
        "No tenés clientes con saldo pendiente en la empresa activa."
      );
    }

    const total =
      this.formatearMoneda(
        metricas.saldoTotalPendiente,
      );

    const principales =
      clientes
        .slice(0, 5)
        .map(
          (cliente) =>
            `${cliente.nombre}: ${this.formatearMoneda(
              cliente.saldoPendiente,
            )}`,
        )
        .join("; ");

    const encabezado =
      `Tenés ${metricas.clientesConDeuda} ` +
      `${this.plural(
        metricas.clientesConDeuda,
        "cliente con saldo pendiente",
        "clientes con saldo pendiente",
      )} por ${total} en total.`;

    if (!principales) {
      return encabezado;
    }

    if (metricas.clientesConDeuda <= 5) {
      return `${encabezado} ${principales}.`;
    }

    return (
      `${encabezado} Los 5 mayores saldos son: ` +
      `${principales}.`
    );
  }


  private respuestaResumenCaja(
    resumen: ResumenCajaMes,
    preguntaNormalizada: string,
  ): string {
    const { metricas, periodo, mayoresEgresos } =
      resumen;

    const ingresos =
      this.formatearMoneda(
        metricas.totalIngresos,
      );

    const egresos =
      this.formatearMoneda(
        metricas.totalEgresos,
      );

    const saldo =
      this.formatearMoneda(
        metricas.saldoPeriodo,
      );

    const pideMayoresEgresos =
      preguntaNormalizada.includes(
        "mayores egresos",
      ) ||
      preguntaNormalizada.includes(
        "mayor egreso",
      ) ||
      preguntaNormalizada.includes(
        "egresos mas grandes",
      ) ||
      preguntaNormalizada.includes(
        "egresos mas altos",
      );

    if (pideMayoresEgresos) {
      if (mayoresEgresos.length === 0) {
        return (
          `En lo que va de ${periodo.etiqueta} no hay egresos registrados en Caja.`
        );
      }

      const detalle =
        mayoresEgresos
          .map(
            (movimiento, indice) =>
              `${indice + 1}. ${movimiento.concepto}: ` +
              `${this.formatearMoneda(
                movimiento.importe,
              )}`,
          )
          .join("; ");

      return (
        `Los mayores egresos de Caja en lo que va de ${periodo.etiqueta} son: ` +
        `${detalle}. El total de egresos del período es ${egresos}.`
      );
    }

    const pideIngresos =
      /\b(ingreso|ingresos|entro|entraron|cobros de caja)\b/.test(
        preguntaNormalizada,
      );

    if (pideIngresos) {
      return (
        `En lo que va de ${periodo.etiqueta} ingresaron ${ingresos} en Caja, ` +
        `en ${metricas.cantidadIngresos} ` +
        `${this.plural(
          metricas.cantidadIngresos,
          "movimiento de ingreso",
          "movimientos de ingreso",
        )}.`
      );
    }

    const pideEgresos =
      /\b(egreso|egresos|salio|salieron|gaste|gastamos|gastos de caja)\b/.test(
        preguntaNormalizada,
      );

    if (pideEgresos) {
      return (
        `En lo que va de ${periodo.etiqueta} salieron ${egresos} de Caja, ` +
        `en ${metricas.cantidadEgresos} ` +
        `${this.plural(
          metricas.cantidadEgresos,
          "movimiento de egreso",
          "movimientos de egreso",
        )}.`
      );
    }

    if (metricas.movimientosRegistrados === 0) {
      return (
        `En lo que va de ${periodo.etiqueta} no hay movimientos registrados en Caja.`
      );
    }

    return (
      `En lo que va de ${periodo.etiqueta}, Caja registra ${ingresos} de ingresos ` +
      `y ${egresos} de egresos. El saldo neto del período es ${saldo}, ` +
      `con ${metricas.movimientosRegistrados} ` +
      `${this.plural(
        metricas.movimientosRegistrados,
        "movimiento registrado",
        "movimientos registrados",
      )}.`
    );
  }

  async obtenerContextoSeguro(
    user: AuthUser,
    comercioId: string,
  ) {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    const { data: comercio, error: errorComercio } =
      await this.supabase.client
        .from("comercios")
        .select(
          "id, nombre_comercial, cuenta_drito_id",
        )
        .eq("id", comercioId)
        .maybeSingle();

    if (errorComercio) {
      throw errorComercio;
    }

    if (!comercio) {
      throw new NotFoundException(
        "La empresa solicitada no existe.",
      );
    }

    const comercioSeguro =
      comercio as ComercioAssistant;

    const { data: cuenta, error: errorCuenta } =
      await this.supabase.client
        .from("cuentas_drito")
        .select("id, nombre, activo")
        .eq(
          "id",
          comercioSeguro.cuenta_drito_id,
        )
        .eq("activo", true)
        .maybeSingle();

    if (errorCuenta) {
      throw errorCuenta;
    }

    if (!cuenta) {
      throw new ForbiddenException(
        "La Cuenta Drito de esta empresa no está activa.",
      );
    }

    const cuentaSegura =
      cuenta as CuentaAssistant;

    const permisos =
      await this.obtenerPermisosHabilitados(
        vinculacion,
      );

    return {
      ok: true,
      soloLectura: true,
      usuario: {
        id: user.id,
        email: user.email,
      },
      cuentaDrito: {
        id: cuentaSegura.id,
        nombre: cuentaSegura.nombre,
      },
      comercio: {
        id: comercioSeguro.id,
        nombre:
          comercioSeguro.nombre_comercial,
      },
      acceso: {
        usuarioComercioId:
          vinculacion.id,
        rol: vinculacion.rol,
        cargo: vinculacion.cargo,
        esAdmin:
          vinculacion.rol === "admin",
        permisos,
      },
    };
  }

  async obtenerResumenVentasMes(
    user: AuthUser,
    comercioId: string,
  ): Promise<ResumenVentasMes> {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "ventas.ver",
    );

    const rango =
      this.rangoMesActualArgentina();

    const { data, error } =
      await this.supabase.client
        .from("ventas")
        .select(
          "id, estado, estado_pago, fecha_venta, total, total_pagado",
        )
        .eq("comercio_id", comercioId)
        .eq("estado", "confirmada")
        .gte("fecha_venta", rango.desde)
        .lt(
          "fecha_venta",
          rango.hastaExclusivo,
        )
        .order("fecha_venta", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    const ventas =
      (data ?? []) as VentaResumen[];

    let totalVendido = 0;
    let totalCobrado = 0;
    let ventasPendientes = 0;
    let ventasPagadas = 0;

    for (const venta of ventas) {
      const total =
        Number(venta.total ?? 0);

      const pagado =
        Number(venta.total_pagado ?? 0);

      totalVendido += total;
      totalCobrado += pagado;

      if (venta.estado_pago === "pagada") {
        ventasPagadas += 1;
      } else {
        ventasPendientes += 1;
      }
    }

    const saldoPendiente =
      Math.max(
        0,
        totalVendido - totalCobrado,
      );

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "ventas.resumen_mes",
      comercioId,
      periodo: {
        etiqueta: rango.etiqueta,
        desde: rango.desde,
        hastaExclusivo:
          rango.hastaExclusivo,
      },
      metricas: {
        cantidadVentas:
          ventas.length,
        totalVendido,
        totalCobrado,
        saldoPendiente,
        ventasPendientes,
        ventasPagadas,
      },
    };
  }

  async obtenerClientesConDeuda(
    user: AuthUser,
    comercioId: string,
  ): Promise<ResumenClientesConDeuda> {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "cuentas_clientes.ver",
    );

    const { data, error } =
      await this.supabase.client
        .from("ventas")
        .select(`
          cliente_id,
          total,
          total_pagado,
          estado_pago,
          cliente:clientes (
            nombre,
            razon_social,
            activo
          )
        `)
        .eq("comercio_id", comercioId)
        .eq("estado", "confirmada")
        .not("cliente_id", "is", null);

    if (error) {
      throw error;
    }

    const ventas =
      (data ?? []) as unknown as VentaCuentaCliente[];

    const porCliente =
      new Map<string, ClienteConDeuda>();

    for (const venta of ventas) {
      if (!venta.cliente_id) {
        continue;
      }

      const total = Number(venta.total ?? 0);
      const cobrado = Number(venta.total_pagado ?? 0);
      const saldo = Math.max(0, total - cobrado);

      const cliente =
        this.obtenerClienteRelacion(
          venta.cliente,
        );

      const nombre =
        cliente?.razon_social?.trim() ||
        cliente?.nombre?.trim() ||
        "Cliente sin nombre";

      const existente =
        porCliente.get(venta.cliente_id);

      if (!existente) {
        porCliente.set(
          venta.cliente_id,
          {
            clienteId: venta.cliente_id,
            nombre,
            activo: cliente?.activo !== false,
            totalVentas: total,
            totalCobrado: cobrado,
            saldoPendiente: saldo,
            ventasPendientes: saldo > 0 ? 1 : 0,
          },
        );

        continue;
      }

      existente.totalVentas += total;
      existente.totalCobrado += cobrado;
      existente.saldoPendiente += saldo;

      if (saldo > 0) {
        existente.ventasPendientes += 1;
      }
    }

    const clientes =
      [...porCliente.values()]
        .filter(
          (cliente) =>
            cliente.saldoPendiente > 0,
        )
        .sort(
          (a, b) =>
            b.saldoPendiente -
            a.saldoPendiente,
        );

    const saldoTotalPendiente =
      clientes.reduce(
        (total, cliente) =>
          total + cliente.saldoPendiente,
        0,
      );

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "cuentas_clientes.deudores",
      comercioId,
      metricas: {
        clientesConDeuda: clientes.length,
        saldoTotalPendiente,
      },
      clientes,
    };
  }


  async obtenerResumenCajaMes(
    user: AuthUser,
    comercioId: string,
  ): Promise<ResumenCajaMes> {
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    await this.exigirPermiso(
      vinculacion,
      "caja.ver",
    );

    const rango =
      this.rangoCajaMesActualArgentina();

    /*
     * Replica la semántica actual de la pantalla Caja:
     * sólo movimientos con estado "registrado" y dentro
     * del rango elegido. Para el chat usamos por defecto
     * inicio del mes -> hoy, igual que la UI.
     */
    const { data, error } =
      await this.supabase.client
        .from("movimientos_caja")
        .select(
          "id, tipo, fecha, importe, concepto, medio_pago, origen, estado, created_at",
        )
        .eq("comercio_id", comercioId)
        .eq("estado", "registrado")
        .gte("fecha", rango.desde)
        .lte("fecha", rango.hasta)
        .order("fecha", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      throw error;
    }

    const movimientos =
      (data ?? []) as MovimientoCajaAssistant[];

    let totalIngresos = 0;
    let totalEgresos = 0;
    let cantidadIngresos = 0;
    let cantidadEgresos = 0;

    for (const movimiento of movimientos) {
      const importe =
        Number(movimiento.importe ?? 0);

      if (movimiento.tipo === "ingreso") {
        totalIngresos += importe;
        cantidadIngresos += 1;
      }

      if (movimiento.tipo === "egreso") {
        totalEgresos += importe;
        cantidadEgresos += 1;
      }
    }

    const mayoresEgresos =
      movimientos
        .filter(
          (movimiento) =>
            movimiento.tipo === "egreso",
        )
        .map(
          (movimiento): EgresoCajaDestacado => ({
            id: movimiento.id,
            fecha: movimiento.fecha,
            importe: Number(
              movimiento.importe ?? 0,
            ),
            concepto:
              movimiento.concepto?.trim() ||
              "Egreso de Caja",
            medioPago:
              movimiento.medio_pago,
            origen:
              movimiento.origen,
          }),
        )
        .sort(
          (a, b) =>
            b.importe - a.importe,
        )
        .slice(0, 5);

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "caja.resumen_mes",
      comercioId,
      periodo: {
        etiqueta: rango.etiqueta,
        desde: rango.desde,
        hasta: rango.hasta,
      },
      metricas: {
        totalIngresos,
        totalEgresos,
        saldoPeriodo:
          totalIngresos - totalEgresos,
        movimientosRegistrados:
          movimientos.length,
        cantidadIngresos,
        cantidadEgresos,
      },
      mayoresEgresos,
    };
  }



  private rangoComparativoMesesArgentina(): {
    actual: {
      etiqueta: string;
      desde: string;
      hasta: string;
      diasComparados: number;
    };
    anterior: {
      etiqueta: string;
      desde: string;
      hasta: string;
      diasComparados: number;
    };
  } {
    const hoyIso =
      this.fechaActualArgentina();

    const [
      yearTexto,
      monthTexto,
      dayTexto,
    ] =
      hoyIso.split("-");

    const year =
      Number(yearTexto);
    const month =
      Number(monthTexto);
    const day =
      Number(dayTexto);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      throw new Error(
        "No se pudo resolver el período comparativo.",
      );
    }

    const actualDesde =
      `${year}-${String(
        month,
      ).padStart(
        2,
        "0",
      )}-01`;

    const actualHasta =
      hoyIso;

    const previousMonthZero =
      month - 2;

    const previousDate =
      new Date(
        Date.UTC(
          year,
          previousMonthZero,
          1,
        ),
      );

    const previousYear =
      previousDate.getUTCFullYear();

    const previousMonth =
      previousDate.getUTCMonth() + 1;

    const ultimoDiaAnterior =
      new Date(
        Date.UTC(
          previousYear,
          previousMonth,
          0,
        ),
      ).getUTCDate();

    const diaComparableAnterior =
      Math.min(
        day,
        ultimoDiaAnterior,
      );

    const anteriorDesde =
      `${previousYear}-${String(
        previousMonth,
      ).padStart(
        2,
        "0",
      )}-01`;

    const anteriorHasta =
      `${previousYear}-${String(
        previousMonth,
      ).padStart(
        2,
        "0",
      )}-${String(
        diaComparableAnterior,
      ).padStart(
        2,
        "0",
      )}`;

    const etiquetaActual =
      new Intl.DateTimeFormat(
        "es-AR",
        {
          timeZone:
            "America/Argentina/Buenos_Aires",
          month:
            "long",
          year:
            "numeric",
        },
      ).format(
        new Date(
          `${actualDesde}T12:00:00-03:00`,
        ),
      );

    const etiquetaAnterior =
      new Intl.DateTimeFormat(
        "es-AR",
        {
          timeZone:
            "America/Argentina/Buenos_Aires",
          month:
            "long",
          year:
            "numeric",
        },
      ).format(
        new Date(
          `${anteriorDesde}T12:00:00-03:00`,
        ),
      );

    return {
      actual: {
        etiqueta:
          etiquetaActual,
        desde:
          actualDesde,
        hasta:
          actualHasta,
        diasComparados:
          day,
      },
      anterior: {
        etiqueta:
          etiquetaAnterior,
        desde:
          anteriorDesde,
        hasta:
          anteriorHasta,
        diasComparados:
          diaComparableAnterior,
      },
    };
  }

  private compararNumeros(
    actual: number,
    anterior: number,
  ): ComparacionNumeroDrito {
    const actualSeguro =
      Number.isFinite(actual)
        ? actual
        : 0;

    const anteriorSeguro =
      Number.isFinite(anterior)
        ? anterior
        : 0;

    const diferencia =
      actualSeguro -
      anteriorSeguro;

    if (
      anteriorSeguro === 0
    ) {
      if (
        actualSeguro === 0
      ) {
        return {
          actual:
            actualSeguro,
          anterior:
            anteriorSeguro,
          diferencia:
            0,
          variacionPorcentaje:
            0,
          direccion:
            "igual",
        };
      }

      return {
        actual:
          actualSeguro,
        anterior:
          anteriorSeguro,
        diferencia,
        variacionPorcentaje:
          null,
        direccion:
          "sin_base",
      };
    }

    const variacionPorcentaje =
      Math.round(
        (
          diferencia /
          Math.abs(
            anteriorSeguro,
          )
        ) *
        10000,
      ) / 100;

    return {
      actual:
        actualSeguro,
      anterior:
        anteriorSeguro,
      diferencia,
      variacionPorcentaje,
      direccion:
        diferencia > 0
          ? "sube"
          : diferencia < 0
            ? "baja"
            : "igual",
    };
  }

  private formatearPorcentaje(
    valor: number,
  ): string {
    return new Intl.NumberFormat(
      "es-AR",
      {
        minimumFractionDigits:
          0,
        maximumFractionDigits:
          2,
      },
    ).format(
      Math.abs(valor),
    );
  }

  private describirComparacionMonetaria(
    comparacion:
      ComparacionNumeroDrito,
  ): string {
    if (
      comparacion.direccion ===
      "igual"
    ) {
      return comparacion.actual === 0
        ? "sin movimiento en ambos períodos"
        : `sin cambios: ${this.formatearMoneda(
          comparacion.actual,
        )} en ambos períodos`;
    }

    if (
      comparacion.direccion ===
      "sin_base"
    ) {
      return `pasó de ${this.formatearMoneda(
        comparacion.anterior,
      )} a ${this.formatearMoneda(
        comparacion.actual,
      )}; no hay una base porcentual comparable`;
    }

    const verbo =
      comparacion.direccion ===
        "sube"
        ? "subió"
        : "bajó";

    const porcentaje =
      comparacion.variacionPorcentaje ===
        null
        ? ""
        : ` (${this.formatearPorcentaje(
          comparacion.variacionPorcentaje,
        )}%)`;

    return `${verbo} ${this.formatearMoneda(
      Math.abs(
        comparacion.diferencia,
      ),
    )}${porcentaje}: ${this.formatearMoneda(
      comparacion.anterior,
    )} → ${this.formatearMoneda(
      comparacion.actual,
    )}`;
  }

  private describirComparacionCantidad(
    comparacion:
      ComparacionNumeroDrito,
    singular: string,
    plural: string,
  ): string {
    const actual =
      comparacion.actual;

    const anterior =
      comparacion.anterior;

    if (
      comparacion.direccion ===
      "igual"
    ) {
      return `${actual} ${this.plural(
        actual,
        singular,
        plural,
      )} en ambos períodos`;
    }

    if (
      comparacion.direccion ===
      "sin_base"
    ) {
      return `${anterior} → ${actual} ${this.plural(
        actual,
        singular,
        plural,
      )}`;
    }

    const verbo =
      comparacion.direccion ===
        "sube"
        ? "subió"
        : "bajó";

    const porcentaje =
      comparacion.variacionPorcentaje ===
        null
        ? ""
        : ` ${this.formatearPorcentaje(
          comparacion.variacionPorcentaje,
        )}%`;

    return `${verbo}${porcentaje}: ${anterior} → ${actual} ${this.plural(
      actual,
      singular,
      plural,
    )}`;
  }

  private async obtenerVentasPeriodoTendencia(
    comercioId: string,
    desde: string,
    hasta: string,
  ): Promise<ResumenPeriodoVentasTendencia> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from("ventas")
        .select(
          "id, total",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "confirmada",
        )
        .gte(
          "fecha_venta",
          desde,
        )
        .lte(
          "fecha_venta",
          hasta,
        );

    if (error) {
      throw error;
    }

    const ventas =
      (data ?? []) as Array<{
        id: string;
        total:
        number | string | null;
      }>;

    const totalVendido =
      ventas.reduce(
        (
          acumulado,
          venta,
        ) =>
          acumulado +
          Number(
            venta.total ?? 0,
          ),
        0,
      );

    return {
      cantidadVentas:
        ventas.length,
      totalVendido,
      ticketPromedio:
        ventas.length > 0
          ? totalVendido /
          ventas.length
          : 0,
    };
  }

  private async obtenerCobrosPeriodoTendencia(
    comercioId: string,
    desde: string,
    hasta: string,
  ): Promise<ResumenPeriodoCobrosTendencia> {
    /*
     * pagos_ventas es la fuente canónica para dinero recibido
     * aplicado a ventas. Incluye cobros directos y aplicaciones
     * internas de cobros agrupados, sin contar retenciones como
     * dinero.
     */
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from(
          "pagos_ventas",
        )
        .select(
          "id, importe",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "registrado",
        )
        .gte(
          "fecha_pago",
          desde,
        )
        .lte(
          "fecha_pago",
          hasta,
        );

    if (error) {
      throw error;
    }

    const cobros =
      (data ?? []) as Array<{
        id: string;
        importe:
        number | string | null;
      }>;

    const totalCobrado =
      cobros.reduce(
        (
          acumulado,
          cobro,
        ) =>
          acumulado +
          Number(
            cobro.importe ?? 0,
          ),
        0,
      );

    return {
      cantidadCobros:
        cobros.length,
      totalCobrado,
    };
  }

  private async obtenerGastosPeriodoTendencia(
    comercioId: string,
    desde: string,
    hasta: string,
  ): Promise<ResumenPeriodoGastosTendencia> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from(
          "gastos_generales",
        )
        .select(
          "id, importe",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "registrado",
        )
        .gte(
          "fecha_gasto",
          desde,
        )
        .lte(
          "fecha_gasto",
          hasta,
        );

    if (error) {
      throw error;
    }

    const gastos =
      (data ?? []) as Array<{
        id: string;
        importe:
        number | string | null;
      }>;

    const totalGastos =
      gastos.reduce(
        (
          acumulado,
          gasto,
        ) =>
          acumulado +
          Number(
            gasto.importe ?? 0,
          ),
        0,
      );

    return {
      cantidadGastos:
        gastos.length,
      totalGastos,
    };
  }

  private async obtenerCajaPeriodoTendencia(
    comercioId: string,
    desde: string,
    hasta: string,
  ): Promise<ResumenPeriodoCajaTendencia> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from(
          "movimientos_caja",
        )
        .select(
          "id, tipo, importe",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "registrado",
        )
        .gte(
          "fecha",
          desde,
        )
        .lte(
          "fecha",
          hasta,
        );

    if (error) {
      throw error;
    }

    const movimientos =
      (data ?? []) as Array<{
        id: string;
        tipo:
        "ingreso" | "egreso";
        importe:
        number | string | null;
      }>;

    let ingresos = 0;
    let egresos = 0;

    for (
      const movimiento of
      movimientos
    ) {
      const importe =
        Number(
          movimiento.importe ?? 0,
        );

      if (
        movimiento.tipo ===
        "ingreso"
      ) {
        ingresos += importe;
      }

      if (
        movimiento.tipo ===
        "egreso"
      ) {
        egresos += importe;
      }
    }

    return {
      ingresos,
      egresos,
      saldo:
        ingresos - egresos,
      movimientos:
        movimientos.length,
    };
  }

  private async obtenerTendenciaNegocio(
    comercioId: string,
    vinculacion: UsuarioComercio,
  ): Promise<TendenciaNegocioDrito> {
    const rango =
      this.rangoComparativoMesesArgentina();

    const [
      puedeVentas,
      puedeGastos,
      puedeCaja,
    ] =
      await Promise.all([
        this.permisoHabilitado(
          vinculacion,
          "ventas.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "gastos.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "caja.ver",
        ),
      ]);

    const fuentesDisponibles:
      string[] = [];

    const fuentesOmitidas:
      string[] = [];

    if (puedeVentas) {
      fuentesDisponibles.push(
        "Ventas",
        "Cobros",
      );
    } else {
      fuentesOmitidas.push(
        "Ventas",
        "Cobros",
      );
    }

    if (puedeGastos) {
      fuentesDisponibles.push(
        "Gastos",
      );
    } else {
      fuentesOmitidas.push(
        "Gastos",
      );
    }

    if (puedeCaja) {
      fuentesDisponibles.push(
        "Caja",
      );
    } else {
      fuentesOmitidas.push(
        "Caja",
      );
    }

    const [
      ventasActual,
      ventasAnterior,
      cobrosActual,
      cobrosAnterior,
      gastosActual,
      gastosAnterior,
      cajaActual,
      cajaAnterior,
    ] =
      await Promise.all([
        puedeVentas
          ? this.obtenerVentasPeriodoTendencia(
            comercioId,
            rango.actual.desde,
            rango.actual.hasta,
          )
          : Promise.resolve(
            null,
          ),
        puedeVentas
          ? this.obtenerVentasPeriodoTendencia(
            comercioId,
            rango.anterior.desde,
            rango.anterior.hasta,
          )
          : Promise.resolve(
            null,
          ),
        puedeVentas
          ? this.obtenerCobrosPeriodoTendencia(
            comercioId,
            rango.actual.desde,
            rango.actual.hasta,
          )
          : Promise.resolve(
            null,
          ),
        puedeVentas
          ? this.obtenerCobrosPeriodoTendencia(
            comercioId,
            rango.anterior.desde,
            rango.anterior.hasta,
          )
          : Promise.resolve(
            null,
          ),
        puedeGastos
          ? this.obtenerGastosPeriodoTendencia(
            comercioId,
            rango.actual.desde,
            rango.actual.hasta,
          )
          : Promise.resolve(
            null,
          ),
        puedeGastos
          ? this.obtenerGastosPeriodoTendencia(
            comercioId,
            rango.anterior.desde,
            rango.anterior.hasta,
          )
          : Promise.resolve(
            null,
          ),
        puedeCaja
          ? this.obtenerCajaPeriodoTendencia(
            comercioId,
            rango.actual.desde,
            rango.actual.hasta,
          )
          : Promise.resolve(
            null,
          ),
        puedeCaja
          ? this.obtenerCajaPeriodoTendencia(
            comercioId,
            rango.anterior.desde,
            rango.anterior.hasta,
          )
          : Promise.resolve(
            null,
          ),
      ]);

    const ventas =
      ventasActual &&
        ventasAnterior
        ? {
          actual:
            ventasActual,
          anterior:
            ventasAnterior,
          totalVendido:
            this.compararNumeros(
              ventasActual.totalVendido,
              ventasAnterior.totalVendido,
            ),
          cantidadVentas:
            this.compararNumeros(
              ventasActual.cantidadVentas,
              ventasAnterior.cantidadVentas,
            ),
          ticketPromedio:
            this.compararNumeros(
              ventasActual.ticketPromedio,
              ventasAnterior.ticketPromedio,
            ),
        }
        : null;

    const cobros =
      cobrosActual &&
        cobrosAnterior
        ? {
          actual:
            cobrosActual,
          anterior:
            cobrosAnterior,
          totalCobrado:
            this.compararNumeros(
              cobrosActual.totalCobrado,
              cobrosAnterior.totalCobrado,
            ),
          cantidadCobros:
            this.compararNumeros(
              cobrosActual.cantidadCobros,
              cobrosAnterior.cantidadCobros,
            ),
        }
        : null;

    const gastos =
      gastosActual &&
        gastosAnterior
        ? {
          actual:
            gastosActual,
          anterior:
            gastosAnterior,
          totalGastos:
            this.compararNumeros(
              gastosActual.totalGastos,
              gastosAnterior.totalGastos,
            ),
          cantidadGastos:
            this.compararNumeros(
              gastosActual.cantidadGastos,
              gastosAnterior.cantidadGastos,
            ),
        }
        : null;

    const caja =
      cajaActual &&
        cajaAnterior
        ? {
          actual:
            cajaActual,
          anterior:
            cajaAnterior,
          ingresos:
            this.compararNumeros(
              cajaActual.ingresos,
              cajaAnterior.ingresos,
            ),
          egresos:
            this.compararNumeros(
              cajaActual.egresos,
              cajaAnterior.egresos,
            ),
          saldo:
            this.compararNumeros(
              cajaActual.saldo,
              cajaAnterior.saldo,
            ),
        }
        : null;

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "negocio.tendencia_mes",
      comercioId,
      criterio:
        "mes_a_fecha_vs_mismo_tramo_mes_anterior",
      periodoActual:
        rango.actual,
      periodoAnterior:
        rango.anterior,
      fuentesDisponibles,
      fuentesOmitidas,
      ventas,
      cobros,
      gastos,
      caja,
    };
  }

  private respuestaTendenciaNegocio(
    tendencia:
      TendenciaNegocioDrito,
    mensajeOriginal: string,
  ): string {
    const texto =
      this.normalizarTexto(
        mensajeOriginal,
      );

    const pideSoloVentas =
      /\b(venta|ventas|vendiendo|vendi)\b/.test(
        texto,
      ) &&
      !/\b(cobro|cobros|cobrando|gasto|gastos|caja)\b/.test(
        texto,
      );

    const pideSoloCobros =
      /\b(cobro|cobros|cobrando|cobrar)\b/.test(
        texto,
      ) &&
      !/\b(venta|ventas|gasto|gastos|caja)\b/.test(
        texto,
      );

    const pideSoloGastos =
      /\b(gasto|gastos|gastando)\b/.test(
        texto,
      ) &&
      !/\b(venta|ventas|cobro|cobros|caja)\b/.test(
        texto,
      );

    const partes:
      string[] = [];

    partes.push(
      `Comparación comparable: ${tendencia.periodoActual.desde} a ${tendencia.periodoActual.hasta} contra ${tendencia.periodoAnterior.desde} a ${tendencia.periodoAnterior.hasta}. Así no comparo un mes todavía incompleto contra un mes entero.`,
    );

    if (
      tendencia.ventas &&
      (
        pideSoloVentas ||
        (
          !pideSoloCobros &&
          !pideSoloGastos
        )
      )
    ) {
      partes.push(
        `Ventas: ${this.describirComparacionMonetaria(
          tendencia.ventas.totalVendido,
        )}. En cantidad, ${this.describirComparacionCantidad(
          tendencia.ventas.cantidadVentas,
          "venta",
          "ventas",
        )}. Ticket promedio: ${this.describirComparacionMonetaria(
          tendencia.ventas.ticketPromedio,
        )}.`,
      );
    }

    if (
      tendencia.cobros &&
      (
        pideSoloCobros ||
        (
          !pideSoloVentas &&
          !pideSoloGastos
        )
      )
    ) {
      partes.push(
        `Cobros: ${this.describirComparacionMonetaria(
          tendencia.cobros.totalCobrado,
        )}. En cantidad, ${this.describirComparacionCantidad(
          tendencia.cobros.cantidadCobros,
          "cobro",
          "cobros",
        )}.`,
      );
    }

    if (
      tendencia.gastos &&
      (
        pideSoloGastos ||
        (
          !pideSoloVentas &&
          !pideSoloCobros
        )
      )
    ) {
      partes.push(
        `Gastos generales: ${this.describirComparacionMonetaria(
          tendencia.gastos.totalGastos,
        )}. Esto describe el cambio de gasto; por sí solo no significa que sea bueno o malo.`,
      );
    }

    if (
      tendencia.caja &&
      !pideSoloVentas &&
      !pideSoloCobros &&
      !pideSoloGastos
    ) {
      partes.push(
        `Caja: el saldo del tramo pasó de ${this.formatearMoneda(
          tendencia.caja.anterior.saldo,
        )} a ${this.formatearMoneda(
          tendencia.caja.actual.saldo,
        )}. Ingresos: ${this.describirComparacionMonetaria(
          tendencia.caja.ingresos,
        )}. Egresos: ${this.describirComparacionMonetaria(
          tendencia.caja.egresos,
        )}.`,
      );
    }

    if (
      pideSoloCobros &&
      tendencia.cobros
    ) {
      const comparacion =
        tendencia.cobros.totalCobrado;

      if (
        comparacion.direccion ===
        "sube"
      ) {
        partes.push(
          "En monto efectivamente cobrado, este tramo viene mejor que el comparable del mes pasado.",
        );
      } else if (
        comparacion.direccion ===
        "baja"
      ) {
        partes.push(
          "En monto efectivamente cobrado, este tramo viene por debajo del comparable del mes pasado.",
        );
      } else if (
        comparacion.direccion ===
        "igual"
      ) {
        partes.push(
          "En monto efectivamente cobrado, el ritmo está igual al tramo comparable del mes pasado.",
        );
      } else {
        partes.push(
          "Hubo cobros en el tramo actual pero el período anterior parte de cero, así que no es responsable expresar una mejora porcentual.",
        );
      }
    }

    if (
      tendencia.fuentesOmitidas.length >
      0
    ) {
      partes.push(
        `Por permisos no incluí: ${tendencia.fuentesOmitidas.join(
          ", ",
        )}.`,
      );
    }

    return partes.join(
      " ",
    );
  }

  private accionesTendenciaNegocio(
    tendencia:
      TendenciaNegocioDrito,
    mensajeOriginal: string,
  ): DritoAssistantAction[] {
    const texto =
      this.normalizarTexto(
        mensajeOriginal,
      );

    const pideSoloVentas =
      /\b(venta|ventas|vendiendo|vendi)\b/.test(
        texto,
      ) &&
      !/\b(cobro|cobros|cobrando|gasto|gastos|caja)\b/.test(
        texto,
      );

    const pideSoloCobros =
      /\b(cobro|cobros|cobrando|cobrar)\b/.test(
        texto,
      ) &&
      !/\b(venta|ventas|gasto|gastos|caja)\b/.test(
        texto,
      );

    const pideSoloGastos =
      /\b(gasto|gastos|gastando)\b/.test(
        texto,
      ) &&
      !/\b(venta|ventas|cobro|cobros|caja)\b/.test(
        texto,
      );

    const acciones:
      DritoAssistantAction[] =
      [];

    if (
      tendencia.ventas &&
      (
        pideSoloVentas ||
        pideSoloCobros ||
        (
          !pideSoloVentas &&
          !pideSoloCobros &&
          !pideSoloGastos
        )
      )
    ) {
      acciones.push({
        id:
          "tendencia-ver-ventas",
        tipo:
          "navegar",
        label:
          pideSoloCobros
            ? "Ver cobros en Ventas"
            : "Ver Ventas",
        path:
          "/app/ventas",
      });
    }

    if (
      tendencia.gastos &&
      (
        pideSoloGastos ||
        (
          !pideSoloVentas &&
          !pideSoloCobros &&
          !pideSoloGastos
        )
      ) &&
      acciones.length < 3
    ) {
      acciones.push({
        id:
          "tendencia-ver-gastos",
        tipo:
          "navegar",
        label:
          "Ver Gastos",
        path:
          "/app/gastos",
      });
    }

    if (
      tendencia.caja &&
      !pideSoloVentas &&
      !pideSoloGastos &&
      acciones.length < 3
    ) {
      acciones.push({
        id:
          "tendencia-ver-caja",
        tipo:
          "navegar",
        label:
          "Ver Caja",
        path:
          "/app/caja",
      });
    }

    return acciones;
  }





  private fechaAOrdinalDrito(
    fechaIso: string,
  ): number {
    const [
      yearTexto,
      monthTexto,
      dayTexto,
    ] =
      fechaIso.split("-");

    const year =
      Number(yearTexto);
    const month =
      Number(monthTexto);
    const day =
      Number(dayTexto);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      throw new BadRequestException(
        `Fecha inválida: ${fechaIso}`,
      );
    }

    return Math.floor(
      Date.UTC(
        year,
        month - 1,
        day,
      ) /
      86400000,
    );
  }

  private diasRespectoHoyDrito(
    fechaIso: string,
  ): number {
    return (
      this.fechaAOrdinalDrito(
        fechaIso,
      ) -
      this.fechaAOrdinalDrito(
        this.fechaActualArgentina(),
      )
    );
  }

  private formatearFechaAgendaDrito(
    fechaIso: string,
  ): string {
    const [
      year,
      month,
      day,
    ] =
      fechaIso.split("-");

    return `${day}/${month}/${year}`;
  }

  private obtenerRelacionAgenda<T>(
    relacion:
      | T
      | T[]
      | null,
  ): T | null {
    if (!relacion) {
      return null;
    }

    return Array.isArray(relacion)
      ? relacion[0] ?? null
      : relacion;
  }

  private nombreContraparteAgenda(
    relacion:
      | {
        nombre?: string | null;
        razon_social?: string | null;
      }
      | null,
    fallback: string,
  ): string {
    return (
      relacion?.razon_social?.trim() ||
      relacion?.nombre?.trim() ||
      fallback
    );
  }

  private clasificarVencimientoAgenda(
    fechaVencimiento: string,
    ventanaDias = 7,
  ):
    | {
      estadoTemporal:
      EstadoTemporalVencimientoDrito;
      diasRespectoHoy: number;
    }
    | null {
    const dias =
      this.diasRespectoHoyDrito(
        fechaVencimiento,
      );

    if (dias < 0) {
      return {
        estadoTemporal:
          "vencido",
        diasRespectoHoy:
          dias,
      };
    }

    if (dias === 0) {
      return {
        estadoTemporal:
          "vence_hoy",
        diasRespectoHoy:
          0,
      };
    }

    if (dias <= ventanaDias) {
      return {
        estadoTemporal:
          "proximo",
        diasRespectoHoy:
          dias,
      };
    }

    return null;
  }

  private normalizarTelefonoWhatsAppDrito(
    telefono: string | null,
  ): string | null {
    if (!telefono) {
      return null;
    }

    let digitos =
      telefono.replace(
        /\D/g,
        "",
      );

    if (!digitos) {
      return null;
    }

    if (
      digitos.startsWith(
        "00",
      )
    ) {
      digitos =
        digitos.slice(2);
    }

    // Argentina: si el contacto está guardado como número móvil
    // nacional de 10 dígitos, wa.me necesita 54 + 9 + número.
    // Si ya está en formato internacional, se respeta.
    if (
      digitos.length === 10
    ) {
      digitos =
        `549${digitos}`;
    }

    if (
      digitos.length < 10 ||
      digitos.length > 15
    ) {
      return null;
    }

    return digitos;
  }

  private async nombreComercioAgenda(
    comercioId: string,
  ): Promise<string> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from("comercios")
        .select(
          "nombre_comercial",
        )
        .eq(
          "id",
          comercioId,
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    const nombre =
      (
        data as {
          nombre_comercial?:
          string | null;
        } | null
      )?.nombre_comercial?.trim();

    return (
      nombre ||
      "nuestra empresa"
    );
  }

  private async obtenerVencimientosClientesAgenda(
    comercioId: string,
  ): Promise<{
    agenda: VencimientoAgendaDrito[];
    clientesConSaldoSinFecha: number;
  }> {
    const {
      data: ventasData,
      error: ventasError,
    } =
      await this.supabase.client
        .from("ventas")
        .select(`
          id,
          numero,
          cliente_id,
          total,
          total_pagado,
          estado,
          estado_pago,
          cliente:clientes (
            nombre,
            razon_social,
            telefono,
            email,
            activo
          )
        `)
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "confirmada",
        );

    if (ventasError) {
      throw ventasError;
    }

    const ventas =
      (ventasData ??
        []) as unknown as VentaAgendaRow[];

    const ventasPendientes =
      ventas.filter(
        (venta) =>
          Math.max(
            Number(
              venta.total ?? 0,
            ) -
            Number(
              venta.total_pagado ??
              0,
            ),
            0,
          ) > 0,
      );

    if (
      ventasPendientes.length ===
      0
    ) {
      return {
        agenda: [],
        clientesConSaldoSinFecha:
          0,
      };
    }

    const {
      data: fiscalesData,
      error: fiscalesError,
    } =
      await this.supabase.client
        .from(
          "comprobantes_fiscales",
        )
        .select(
          "venta_id, cliente_id, fecha_vencimiento_pago, estado, tipo_comprobante_arca, punto_venta_numero, numero_comprobante",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "autorizado",
        )
        .not(
          "venta_id",
          "is",
          null,
        )
        .not(
          "fecha_vencimiento_pago",
          "is",
          null,
        );

    if (fiscalesError) {
      throw fiscalesError;
    }

    const fiscales =
      (
        fiscalesData ??
        []
      ) as FiscalAgendaRow[];

    // Facturas A/B/C. Notas de crédito/débito no se usan como
    // fecha límite comercial de la venta.
    const tiposFactura =
      new Set([
        1,
        6,
        11,
      ]);

    const fiscalPorVenta =
      new Map<
        string,
        FiscalAgendaRow
      >();

    for (
      const fiscal of
      fiscales
    ) {
      if (
        !fiscal.venta_id ||
        !fiscal.fecha_vencimiento_pago ||
        !tiposFactura.has(
          Number(
            fiscal.tipo_comprobante_arca,
          ),
        )
      ) {
        continue;
      }

      const existente =
        fiscalPorVenta.get(
          fiscal.venta_id,
        );

      if (
        !existente ||
        fiscal.fecha_vencimiento_pago <
        (
          existente.fecha_vencimiento_pago ??
          "9999-12-31"
        )
      ) {
        fiscalPorVenta.set(
          fiscal.venta_id,
          fiscal,
        );
      }
    }

    const agenda:
      VencimientoAgendaDrito[] =
      [];

    const clientesSinFecha =
      new Set<string>();

    for (
      const venta of
      ventasPendientes
    ) {
      if (!venta.cliente_id) {
        continue;
      }

      const saldo =
        Math.round(
          Math.max(
            Number(
              venta.total ?? 0,
            ) -
            Number(
              venta.total_pagado ??
              0,
            ),
            0,
          ) *
          100,
        ) / 100;

      const fiscal =
        fiscalPorVenta.get(
          venta.id,
        );

      if (
        !fiscal?.fecha_vencimiento_pago
      ) {
        clientesSinFecha.add(
          venta.cliente_id,
        );
        continue;
      }

      const clasificacion =
        this.clasificarVencimientoAgenda(
          fiscal.fecha_vencimiento_pago,
        );

      if (!clasificacion) {
        continue;
      }

      const cliente =
        this.obtenerRelacionAgenda(
          venta.cliente,
        );

      const numeroFiscal =
        fiscal.punto_venta_numero !==
          null &&
          fiscal.numero_comprobante !==
          null
          ? `${String(
            Number(
              fiscal.punto_venta_numero,
            ),
          ).padStart(
            5,
            "0",
          )}-${String(
            Number(
              fiscal.numero_comprobante,
            ),
          ).padStart(
            8,
            "0",
          )}`
          : null;

      agenda.push({
        id:
          `cliente:${venta.id}`,
        origen:
          "cobro_cliente",
        estadoTemporal:
          clasificacion.estadoTemporal,
        fechaVencimiento:
          fiscal.fecha_vencimiento_pago,
        diasRespectoHoy:
          clasificacion.diasRespectoHoy,
        saldoPendiente:
          saldo,
        contraparteId:
          venta.cliente_id,
        contraparteNombre:
          this.nombreContraparteAgenda(
            cliente,
            "Cliente sin nombre",
          ),
        documentoInterno:
          `VTA-${String(
            Number(
              venta.numero,
            ),
          ).padStart(
            6,
            "0",
          )}`,
        documentoExterno:
          numeroFiscal
            ? `Factura ${numeroFiscal}`
            : null,
        telefono:
          cliente?.telefono?.trim() ||
          null,
        path:
          "/app/cuentas-corrientes/clientes",
      });
    }

    return {
      agenda,
      clientesConSaldoSinFecha:
        clientesSinFecha.size,
    };
  }

  private async obtenerVencimientosProveedoresAgenda(
    comercioId: string,
  ): Promise<{
    agenda: VencimientoAgendaDrito[];
    proveedoresConSaldoSinFecha: number;
  }> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from("compras")
        .select(`
          id,
          numero,
          proveedor_id,
          total,
          total_pagado,
          fecha_vencimiento,
          estado,
          proveedor:proveedores (
            nombre,
            razon_social,
            activo
          )
        `)
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "confirmada",
        );

    if (error) {
      throw error;
    }

    const compras =
      (data ??
        []) as unknown as CompraAgendaRow[];

    const agenda:
      VencimientoAgendaDrito[] =
      [];

    const proveedoresSinFecha =
      new Set<string>();

    for (
      const compra of
      compras
    ) {
      if (
        !compra.proveedor_id
      ) {
        continue;
      }

      const saldo =
        Math.round(
          Math.max(
            Number(
              compra.total ?? 0,
            ) -
            Number(
              compra.total_pagado ??
              0,
            ),
            0,
          ) *
          100,
        ) / 100;

      if (saldo <= 0) {
        continue;
      }

      if (
        !compra.fecha_vencimiento
      ) {
        proveedoresSinFecha.add(
          compra.proveedor_id,
        );
        continue;
      }

      const clasificacion =
        this.clasificarVencimientoAgenda(
          compra.fecha_vencimiento,
        );

      if (!clasificacion) {
        continue;
      }

      const proveedor =
        this.obtenerRelacionAgenda(
          compra.proveedor,
        );

      agenda.push({
        id:
          `proveedor:${compra.id}`,
        origen:
          "pago_proveedor",
        estadoTemporal:
          clasificacion.estadoTemporal,
        fechaVencimiento:
          compra.fecha_vencimiento,
        diasRespectoHoy:
          clasificacion.diasRespectoHoy,
        saldoPendiente:
          saldo,
        contraparteId:
          compra.proveedor_id,
        contraparteNombre:
          this.nombreContraparteAgenda(
            proveedor,
            "Proveedor sin nombre",
          ),
        documentoInterno:
          `COM-${String(
            Number(
              compra.numero,
            ),
          ).padStart(
            6,
            "0",
          )}`,
        documentoExterno:
          null,
        telefono:
          null,
        path:
          "/app/cuentas-corrientes/proveedores",
      });
    }

    return {
      agenda,
      proveedoresConSaldoSinFecha:
        proveedoresSinFecha.size,
    };
  }

  private async obtenerAgendaVencimientos(
    comercioId: string,
    vinculacion: UsuarioComercio,
  ): Promise<AgendaVencimientosDrito> {
    const [
      puedeClientes,
      puedeVentas,
      puedeProveedores,
      puedeCompras,
    ] =
      await Promise.all([
        this.permisoHabilitado(
          vinculacion,
          "cuentas_clientes.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "ventas.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "cuentas_proveedores.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "compras.ver",
        ),
      ]);

    const puedeAgendaClientes =
      puedeClientes &&
      puedeVentas;

    const puedeAgendaProveedores =
      puedeProveedores &&
      puedeCompras;

    const [
      clientes,
      proveedores,
    ] =
      await Promise.all([
        puedeAgendaClientes
          ? this.obtenerVencimientosClientesAgenda(
            comercioId,
          )
          : Promise.resolve({
            agenda: [],
            clientesConSaldoSinFecha:
              0,
          }),
        puedeAgendaProveedores
          ? this.obtenerVencimientosProveedoresAgenda(
            comercioId,
          )
          : Promise.resolve({
            agenda: [],
            proveedoresConSaldoSinFecha:
              0,
          }),
      ]);

    const todos = [
      ...clientes.agenda,
      ...proveedores.agenda,
    ];

    const ordenar = (
      a: VencimientoAgendaDrito,
      b: VencimientoAgendaDrito,
    ) => {
      if (
        a.diasRespectoHoy !==
        b.diasRespectoHoy
      ) {
        return (
          a.diasRespectoHoy -
          b.diasRespectoHoy
        );
      }

      return (
        b.saldoPendiente -
        a.saldoPendiente
      );
    };

    const vencidos =
      todos
        .filter(
          (
            item,
          ) =>
            item.estadoTemporal ===
            "vencido",
        )
        .sort(ordenar);

    const vencenHoy =
      todos
        .filter(
          (
            item,
          ) =>
            item.estadoTemporal ===
            "vence_hoy",
        )
        .sort(ordenar);

    const proximos =
      todos
        .filter(
          (
            item,
          ) =>
            item.estadoTemporal ===
            "proximo",
        )
        .sort(ordenar);

    const fuentesDisponibles:
      string[] = [];

    const fuentesOmitidas:
      string[] = [];

    if (puedeAgendaClientes) {
      fuentesDisponibles.push(
        "Cobranzas de clientes",
      );
    } else {
      fuentesOmitidas.push(
        "Cobranzas de clientes",
      );
    }

    if (
      puedeAgendaProveedores
    ) {
      fuentesDisponibles.push(
        "Pagos a proveedores",
      );
    } else {
      fuentesOmitidas.push(
        "Pagos a proveedores",
      );
    }

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "negocio.agenda_vencimientos",
      comercioId,
      fecha:
        this.fechaActualArgentina(),
      ventanaDias:
        7,
      vencidos,
      vencenHoy,
      proximos,
      clientesConSaldoSinFecha:
        clientes.clientesConSaldoSinFecha,
      proveedoresConSaldoSinFecha:
        proveedores.proveedoresConSaldoSinFecha,
      fuentesDisponibles,
      fuentesOmitidas,
    };
  }

  private textoVencimientoAgenda(
    item: VencimientoAgendaDrito,
  ): string {
    const fecha =
      this.formatearFechaAgendaDrito(
        item.fechaVencimiento,
      );

    const sentido =
      item.origen ===
        "cobro_cliente"
        ? "cobrar"
        : "pagar";

    if (
      item.estadoTemporal ===
      "vencido"
    ) {
      const dias =
        Math.abs(
          item.diasRespectoHoy,
        );

      return (
        `${item.documentoInterno} · ${item.contraparteNombre}: ${this.formatearMoneda(
          item.saldoPendiente,
        )} por ${sentido}. Venció el ${fecha} hace ${dias} ${this.plural(
          dias,
          "día",
          "días",
        )}.`
      );
    }

    if (
      item.estadoTemporal ===
      "vence_hoy"
    ) {
      return (
        `${item.documentoInterno} · ${item.contraparteNombre}: ${this.formatearMoneda(
          item.saldoPendiente,
        )} por ${sentido}. Vence hoy (${fecha}).`
      );
    }

    return (
      `${item.documentoInterno} · ${item.contraparteNombre}: ${this.formatearMoneda(
        item.saldoPendiente,
      )} por ${sentido}. Vence el ${fecha}, en ${item.diasRespectoHoy} ${this.plural(
        item.diasRespectoHoy,
        "día",
        "días",
      )}.`
    );
  }

  private respuestaAgendaVencimientos(
    agenda:
      AgendaVencimientosDrito,
  ): string {
    const cantidad =
      agenda.vencidos.length +
      agenda.vencenHoy.length +
      agenda.proximos.length;

    const partes:
      string[] = [];

    if (cantidad === 0) {
      partes.push(
        "Agenda de vencimientos: no encontré saldos con una fecha explícita vencida, para hoy o dentro de los próximos 7 días.",
      );
    } else {
      partes.push(
        `Agenda de vencimientos: encontré ${cantidad} ${this.plural(
          cantidad,
          "movimiento con fecha",
          "movimientos con fecha",
        )}.`,
      );

      if (
        agenda.vencidos.length >
        0
      ) {
        partes.push(
          `Vencidos: ${agenda.vencidos
            .slice(0, 4)
            .map(
              (
                item,
              ) =>
                this.textoVencimientoAgenda(
                  item,
                ),
            )
            .join(" ")}`,
        );
      }

      if (
        agenda.vencenHoy.length >
        0
      ) {
        partes.push(
          `Vencen hoy: ${agenda.vencenHoy
            .slice(0, 4)
            .map(
              (
                item,
              ) =>
                this.textoVencimientoAgenda(
                  item,
                ),
            )
            .join(" ")}`,
        );
      }

      if (
        agenda.proximos.length >
        0
      ) {
        partes.push(
          `Próximos 7 días: ${agenda.proximos
            .slice(0, 5)
            .map(
              (
                item,
              ) =>
                this.textoVencimientoAgenda(
                  item,
                ),
            )
            .join(" ")}`,
        );
      }
    }

    const sinFecha =
      agenda.clientesConSaldoSinFecha +
      agenda.proveedoresConSaldoSinFecha;

    if (sinFecha > 0) {
      partes.push(
        `Además hay saldos pendientes sin fecha explícita: ${agenda.clientesConSaldoSinFecha} ${this.plural(
          agenda.clientesConSaldoSinFecha,
          "cliente",
          "clientes",
        )} y ${agenda.proveedoresConSaldoSinFecha} ${this.plural(
          agenda.proveedoresConSaldoSinFecha,
          "proveedor",
          "proveedores",
        )}. No los marco como vencidos ni les invento una fecha.`,
      );
    }

    if (
      agenda.fuentesOmitidas.length >
      0
    ) {
      partes.push(
        `Por permisos no incluí: ${agenda.fuentesOmitidas.join(
          ", ",
        )}.`,
      );
    }

    return partes.join(
      " ",
    );
  }

  private accionesAgendaVencimientos(
    agenda:
      AgendaVencimientosDrito,
  ): DritoAssistantAction[] {
    const acciones:
      DritoAssistantAction[] =
      [];

    const hayClientes = [
      ...agenda.vencidos,
      ...agenda.vencenHoy,
      ...agenda.proximos,
    ].some(
      (
        item,
      ) =>
        item.origen ===
        "cobro_cliente",
    );

    const hayProveedores = [
      ...agenda.vencidos,
      ...agenda.vencenHoy,
      ...agenda.proximos,
    ].some(
      (
        item,
      ) =>
        item.origen ===
        "pago_proveedor",
    );

    if (hayClientes) {
      acciones.push({
        id:
          "agenda-ver-clientes",
        tipo:
          "navegar",
        label:
          "Ver cobranzas",
        path:
          "/app/cuentas-corrientes/clientes",
      });
    }

    if (
      hayProveedores &&
      acciones.length < 3
    ) {
      acciones.push({
        id:
          "agenda-ver-proveedores",
        tipo:
          "navegar",
        label:
          "Ver proveedores",
        path:
          "/app/cuentas-corrientes/proveedores",
      });
    }

    return acciones;
  }

  private extraerClienteRecordatorio(
    mensaje: string,
  ): string | null {
    const normalizado =
      mensaje
        .replace(/[¿?¡!]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const match =
      /(?:enviar|abrir|preparar|armar)(?:me)?\s+(?:un\s+)?recordatorio\s+de\s+pago\s+a\s+(.+)$/i.exec(
        normalizado,
      );

    if (!match) {
      return null;
    }

    return (
      match[1]?.trim() ||
      null
    );
  }

  private async prepararRecordatorioPagoCliente(
    comercioId: string,
    vinculacion: UsuarioComercio,
    nombreBuscado: string,
  ) {
    await this.exigirPermiso(
      vinculacion,
      "cuentas_clientes.ver",
    );

    await this.exigirPermiso(
      vinculacion,
      "ventas.ver",
    );

    const agenda =
      await this.obtenerAgendaVencimientos(
        comercioId,
        vinculacion,
      );

    const obligaciones = [
      ...agenda.vencidos,
      ...agenda.vencenHoy,
      ...agenda.proximos,
    ].filter(
      (
        item,
      ) =>
        item.origen ===
        "cobro_cliente",
    );

    const {
      data: ventasData,
      error: ventasError,
    } =
      await this.supabase.client
        .from("ventas")
        .select(`
          id,
          numero,
          cliente_id,
          total,
          total_pagado,
          estado,
          estado_pago,
          cliente:clientes (
            nombre,
            razon_social,
            telefono,
            email,
            activo
          )
        `)
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "confirmada",
        );

    if (ventasError) {
      throw ventasError;
    }

    const ventas =
      (ventasData ??
        []) as unknown as VentaAgendaRow[];

    const candidatos =
      new Map<
        string,
        {
          id: string;
          nombre: string;
          telefono: string | null;
        }
      >();

    for (
      const venta of ventas
    ) {
      if (
        !venta.cliente_id
      ) {
        continue;
      }

      const relacion =
        this.obtenerRelacionAgenda(
          venta.cliente,
        );

      const nombre =
        this.nombreContraparteAgenda(
          relacion,
          "Cliente sin nombre",
        );

      candidatos.set(
        venta.cliente_id,
        {
          id:
            venta.cliente_id,
          nombre,
          telefono:
            relacion?.telefono?.trim() ||
            null,
        },
      );
    }

    const coincidencia =
      this.elegirCoincidenciaUnica(
        nombreBuscado,
        [...candidatos.values()],
        (
          cliente,
        ) => [
            cliente.nombre,
          ],
      );

    if (
      coincidencia.estado ===
      "no_encontrado"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cobranzas.recordatorio_cliente_no_encontrado",
        respuesta:
          `No encontré un cliente que coincida con “${nombreBuscado}” en esta empresa.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    if (
      coincidencia.estado ===
      "ambiguo"
    ) {
      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cobranzas.recordatorio_cliente_ambiguo",
        respuesta:
          `Encontré más de un cliente posible para “${nombreBuscado}”: ${coincidencia.candidatos
            .map(
              (
                cliente,
              ) =>
                cliente.nombre,
            )
            .join(", ")}. Indicame cuál corresponde.`,
        acciones: [] as DritoAssistantAction[],
      };
    }

    const cliente =
      coincidencia.valor;

    const delCliente =
      obligaciones
        .filter(
          (
            item,
          ) =>
            item.contraparteId ===
            cliente.id,
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.diasRespectoHoy -
            b.diasRespectoHoy,
        );

    if (
      delCliente.length ===
      0
    ) {
      const ventaConSaldo =
        ventas.some(
          (
            venta,
          ) =>
            venta.cliente_id ===
            cliente.id &&
            Math.max(
              Number(
                venta.total ?? 0,
              ) -
              Number(
                venta.total_pagado ??
                0,
              ),
              0,
            ) > 0,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cobranzas.recordatorio_sin_fecha",
        respuesta:
          ventaConSaldo
            ? `${cliente.nombre} tiene saldo pendiente, pero no encontré una fecha de vencimiento explícita vencida, para hoy o dentro de los próximos 7 días. No voy a inventar una fecha para enviar un recordatorio.`
            : `${cliente.nombre} no tiene un saldo pendiente registrado que requiera recordatorio.`,
        acciones: ventaConSaldo
          ? [
            {
              id:
                `ver-cuenta-${cliente.id}`,
              tipo:
                "navegar",
              label:
                "Ver cuenta cliente",
              path:
                "/app/cuentas-corrientes/clientes",
            },
          ] satisfies DritoAssistantAction[]
          : [] as DritoAssistantAction[],
      };
    }

    // Priorizar vencido; luego vence hoy; luego el próximo más cercano.
    const elegida =
      delCliente.find(
        (
          item,
        ) =>
          item.estadoTemporal ===
          "vencido",
      ) ??
      delCliente.find(
        (
          item,
        ) =>
          item.estadoTemporal ===
          "vence_hoy",
      ) ??
      delCliente[0];

    const telefono =
      this.normalizarTelefonoWhatsAppDrito(
        cliente.telefono,
      );

    const fecha =
      this.formatearFechaAgendaDrito(
        elegida.fechaVencimiento,
      );

    const comercio =
      await this.nombreComercioAgenda(
        comercioId,
      );

    const referencia =
      elegida.documentoExterno
        ? `${elegida.documentoInterno} (${elegida.documentoExterno})`
        : elegida.documentoInterno;

    const fraseFecha =
      elegida.estadoTemporal ===
        "vencido"
        ? `cuyo vencimiento fue el ${fecha}`
        : elegida.estadoTemporal ===
          "vence_hoy"
          ? `cuyo vencimiento es hoy ${fecha}`
          : `cuyo vencimiento es el ${fecha}`;

    const mensaje =
      `Hola, ${cliente.nombre}. Te contactamos desde ${comercio} para recordarte que permanece pendiente un saldo de ${this.formatearMoneda(
        elegida.saldoPendiente,
      )} correspondiente a ${referencia}, ${fraseFecha}. Si el pago ya fue realizado, por favor desestimá este mensaje. Gracias.`;

    const acciones:
      DritoAssistantAction[] =
      [];

    if (telefono) {
      acciones.push({
        id:
          `whatsapp-recordatorio-${cliente.id}`,
        tipo:
          "abrir_whatsapp",
        label:
          "Abrir WhatsApp",
        url:
          `https://wa.me/${telefono}?text=${encodeURIComponent(
            mensaje,
          )}`,
      });
    }

    acciones.push({
      id:
        `ver-cuenta-recordatorio-${cliente.id}`,
      tipo:
        "navegar",
      label:
        "Ver cuenta cliente",
      path:
        "/app/cuentas-corrientes/clientes",
    });

    const estadoTexto =
      elegida.estadoTemporal ===
        "vencido"
        ? `venció el ${fecha}`
        : elegida.estadoTemporal ===
          "vence_hoy"
          ? `vence hoy (${fecha})`
          : `vence el ${fecha}`;

    return {
      ok: true,
      soloLectura: true,
      intencion:
        "cobranzas.recordatorio_preparado",
      respuesta:
        `${cliente.nombre}: ${elegida.documentoInterno} tiene ${this.formatearMoneda(
          elegida.saldoPendiente,
        )} pendientes y ${estadoTexto}. ${telefono ? "Preparé el recordatorio con el saldo y la fecha reales. El botón sólo abre WhatsApp con el texto cargado; Drito no lo envía por su cuenta." : "No encontré un teléfono utilizable para WhatsApp en la ficha del cliente, así que no puedo abrir el recordatorio automáticamente."}`,
      acciones,
    };
  }


  private async obtenerPrioridadesOperativas(
    user: AuthUser,
    comercioId: string,
    vinculacion: UsuarioComercio,
  ): Promise<BandejaPrioridadesDrito> {
    const pulso =
      await this.obtenerPulsoNegocio(
        user,
        comercioId,
        vinculacion,
      );

    const prioridades:
      PrioridadOperativaDrito[] =
      [];

    if (
      pulso.caja &&
      pulso.caja.metricas.saldoPeriodo <
      0
    ) {
      prioridades.push({
        codigo:
          "caja_negativa",
        nivel:
          "urgente",
        orden:
          100,
        titulo:
          "Caja del período en negativo",
        motivo:
          "Los egresos superan a los ingresos en el período actual.",
        evidencia:
          `Saldo ${this.formatearMoneda(
            pulso.caja.metricas.saldoPeriodo,
          )}.`,
        path:
          "/app/caja",
      });
    }

    if (
      pulso.proveedores &&
      pulso.proveedores.comprasVencidas >
      0
    ) {
      prioridades.push({
        codigo:
          "proveedores_vencidos",
        nivel:
          "urgente",
        orden:
          95,
        titulo:
          "Compras vencidas con proveedores",
        motivo:
          "Hay obligaciones con fecha de vencimiento ya superada.",
        evidencia:
          `${pulso.proveedores.comprasVencidas} ${this.plural(
            pulso.proveedores.comprasVencidas,
            "compra vencida",
            "compras vencidas",
          )} por ${this.formatearMoneda(
            pulso.proveedores.importeVencido,
          )}.`,
        path:
          "/app/cuentas-corrientes/proveedores",
      });
    }

    if (
      pulso.stock &&
      pulso.stock.sinStock >
      0
    ) {
      prioridades.push({
        codigo:
          "sin_stock",
        nivel:
          "urgente",
        orden:
          90,
        titulo:
          "Productos controlados sin stock",
        motivo:
          "Hay artículos con existencia igual o menor que cero.",
        evidencia:
          `${pulso.stock.sinStock} ${this.plural(
            pulso.stock.sinStock,
            "producto sin stock",
            "productos sin stock",
          )}.`,
        path:
          "/app/stock",
      });
    }

    if (
      pulso.clientes &&
      pulso.clientes.metricas.saldoTotalPendiente >
      0
    ) {
      prioridades.push({
        codigo:
          "clientes_por_cobrar",
        nivel:
          "atencion",
        orden:
          75,
        titulo:
          "Saldos pendientes de clientes",
        motivo:
          "Hay ventas confirmadas con dinero todavía pendiente de cobro.",
        evidencia:
          `${this.formatearMoneda(
            pulso.clientes.metricas.saldoTotalPendiente,
          )} entre ${pulso.clientes.metricas.clientesConDeuda} ${this.plural(
            pulso.clientes.metricas.clientesConDeuda,
            "cliente",
            "clientes",
          )}.`,
        path:
          "/app/cuentas-corrientes/clientes",
      });
    }

    if (
      pulso.stock &&
      pulso.stock.stockBajo >
      0
    ) {
      prioridades.push({
        codigo:
          "stock_bajo",
        nivel:
          "atencion",
        orden:
          70,
        titulo:
          "Productos en stock mínimo",
        motivo:
          "Hay artículos controlados en o por debajo del mínimo configurado.",
        evidencia:
          `${pulso.stock.stockBajo} ${this.plural(
            pulso.stock.stockBajo,
            "producto con stock bajo",
            "productos con stock bajo",
          )}.`,
        path:
          "/app/stock",
      });
    }

    if (
      pulso.proveedores &&
      pulso.proveedores.saldoTotalPendiente >
      0
    ) {
      const yaHayVencidas =
        pulso.proveedores.comprasVencidas >
        0;

      prioridades.push({
        codigo:
          "proveedores_por_pagar",
        nivel:
          yaHayVencidas
            ? "atencion"
            : "seguimiento",
        orden:
          yaHayVencidas
            ? 65
            : 50,
        titulo:
          "Saldo pendiente con proveedores",
        motivo:
          yaHayVencidas
            ? "Además de las compras vencidas, existe deuda total pendiente con proveedores."
            : "Hay compras pendientes de pago, aunque el análisis no detecta vencimientos informados.",
        evidencia:
          `${this.formatearMoneda(
            pulso.proveedores.saldoTotalPendiente,
          )} en ${pulso.proveedores.comprasPendientes} ${this.plural(
            pulso.proveedores.comprasPendientes,
            "compra pendiente",
            "compras pendientes",
          )}.`,
        path:
          "/app/cuentas-corrientes/proveedores",
      });
    }

    prioridades.sort(
      (
        a,
        b,
      ) =>
        b.orden -
        a.orden,
    );

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "negocio.prioridades_operativas",
      comercioId,
      fecha:
        this.fechaActualArgentina(),
      criterio:
        "urgencia_operativa_verificable_sin_asesoria_estrategica",
      prioridades,
      fuentesDisponibles:
        pulso.fuentesDisponibles,
      fuentesOmitidas:
        pulso.fuentesOmitidas,
    };
  }

  private etiquetaPrioridadOperativa(
    nivel:
      NivelPrioridadOperativaDrito,
  ): string {
    if (
      nivel ===
      "urgente"
    ) {
      return "Urgente";
    }

    if (
      nivel ===
      "atencion"
    ) {
      return "Atención";
    }

    return "Seguimiento";
  }

  private respuestaPrioridadesOperativas(
    bandeja:
      BandejaPrioridadesDrito,
  ): string {
    if (
      bandeja.prioridades.length ===
      0
    ) {
      const omitidas =
        bandeja.fuentesOmitidas.length >
          0
          ? ` Por permisos no incluí: ${bandeja.fuentesOmitidas.join(
            ", ",
          )}.`
          : "";

      return (
        `No encuentro pendientes operativos que entren en esta bandeja hoy.${omitidas} Este orden no es asesoría estratégica: sólo muestra estados verificables del sistema.`
      );
    }

    const partes =
      bandeja.prioridades
        .slice(
          0,
          5,
        )
        .map(
          (
            prioridad,
            indice,
          ) =>
            `${indice + 1}) ${this.etiquetaPrioridadOperativa(
              prioridad.nivel,
            )} — ${prioridad.titulo}. ${prioridad.evidencia} Motivo del orden: ${prioridad.motivo}`,
        );

    const resto =
      bandeja.prioridades.length >
        5
        ? ` Hay ${bandeja.prioridades.length - 5} pendientes adicionales de menor orden.`
        : "";

    const omitidas =
      bandeja.fuentesOmitidas.length >
        0
        ? ` Por permisos no incluí: ${bandeja.fuentesOmitidas.join(
          ", ",
        )}.`
        : "";

    return (
      `Bandeja operativa de hoy: ${bandeja.prioridades.length} ${this.plural(
        bandeja.prioridades.length,
        "pendiente",
        "pendientes",
      )}. ${partes.join(
        " ",
      )}${resto}${omitidas} El orden se basa en urgencia verificable (vencimiento, caja, stock y saldos), no en una recomendación estratégica.`
    );
  }

  private accionesPrioridadesOperativas(
    bandeja:
      BandejaPrioridadesDrito,
  ): DritoAssistantAction[] {
    const acciones:
      DritoAssistantAction[] =
      [];

    const usados =
      new Set<string>();

    for (
      const prioridad of
      bandeja.prioridades
    ) {
      if (
        acciones.length >=
        3
      ) {
        break;
      }

      if (
        usados.has(
          prioridad.path,
        )
      ) {
        continue;
      }

      usados.add(
        prioridad.path,
      );

      const label =
        prioridad.path ===
          "/app/caja"
          ? "Ver Caja"
          : prioridad.path ===
            "/app/stock"
            ? "Ver Stock"
            : prioridad.path.includes(
              "clientes",
            )
              ? "Ver clientes con deuda"
              : "Ver proveedores";

      acciones.push({
        id:
          `prioridad-${prioridad.codigo}`,
        tipo:
          "navegar",
        label,
        path:
          prioridad.path,
      });
    }

    return acciones;
  }


  private crearHallazgo(
    hallazgo: HallazgoNegocioDrito,
  ): HallazgoNegocioDrito {
    return hallazgo;
  }

  private async obtenerHallazgosNegocio(
    user: AuthUser,
    comercioId: string,
    vinculacion: UsuarioComercio,
  ): Promise<AnalisisHallazgosDrito> {
    const [
      tendencia,
      pulso,
    ] =
      await Promise.all([
        this.obtenerTendenciaNegocio(
          comercioId,
          vinculacion,
        ),
        this.obtenerPulsoNegocio(
          user,
          comercioId,
          vinculacion,
        ),
      ]);

    const hallazgos:
      HallazgoNegocioDrito[] =
      [];

    // --------------------------------------------------------
    // CAJA: deterioro fuerte de ingresos
    // Umbral: -50% o peor + caída absoluta >= $100.000.
    // --------------------------------------------------------
    if (
      tendencia.caja &&
      tendencia.caja.ingresos.direccion ===
      "baja" &&
      tendencia.caja.ingresos.variacionPorcentaje !==
      null &&
      tendencia.caja.ingresos.variacionPorcentaje <=
      -50 &&
      Math.abs(
        tendencia.caja.ingresos.diferencia,
      ) >= 100000
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "ingresos_caja_caen_fuerte",
          severidad:
            "atencion",
          titulo:
            "Los ingresos de Caja cayeron fuerte",
          detalle:
            `Los ingresos del tramo comparable bajaron ${this.formatearPorcentaje(
              tendencia.caja.ingresos.variacionPorcentaje,
            )}%.`,
          evidencia:
            `${this.formatearMoneda(
              tendencia.caja.ingresos.anterior,
            )} → ${this.formatearMoneda(
              tendencia.caja.ingresos.actual,
            )}; diferencia ${this.formatearMoneda(
              Math.abs(
                tendencia.caja.ingresos.diferencia,
              ),
            )}.`,
          path:
            "/app/caja",
          prioridad:
            96,
        }),
      );
    }

    // --------------------------------------------------------
    // CAJA: el saldo del tramo cruza a negativo.
    // --------------------------------------------------------
    if (
      tendencia.caja &&
      tendencia.caja.anterior.saldo >=
      0 &&
      tendencia.caja.actual.saldo <
      0
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "caja_pasa_negativa",
          severidad:
            "critico",
          titulo:
            "El saldo de Caja pasó a negativo",
          detalle:
            "El tramo actual terminó con más egresos que ingresos.",
          evidencia:
            `${this.formatearMoneda(
              tendencia.caja.anterior.saldo,
            )} → ${this.formatearMoneda(
              tendencia.caja.actual.saldo,
            )}.`,
          path:
            "/app/caja",
          prioridad:
            100,
        }),
      );
    }

    // --------------------------------------------------------
    // CAJA: egresos suben fuerte.
    // Base previa distinta de cero: +50% y +$50.000.
    // Base previa cero: >= $100.000.
    // --------------------------------------------------------
    if (tendencia.caja) {
      const egresos =
        tendencia.caja.egresos;

      const egresosSubenConBase =
        egresos.direccion ===
        "sube" &&
        egresos.variacionPorcentaje !==
        null &&
        egresos.variacionPorcentaje >=
        50 &&
        egresos.diferencia >=
        50000;

      const egresosNuevosRelevantes =
        egresos.direccion ===
        "sin_base" &&
        egresos.actual >=
        100000;

      if (
        egresosSubenConBase ||
        egresosNuevosRelevantes
      ) {
        hallazgos.push(
          this.crearHallazgo({
            codigo:
              "egresos_caja_suben_fuerte",
            severidad:
              "atencion",
            titulo:
              "Los egresos de Caja subieron fuerte",
            detalle:
              egresos.variacionPorcentaje ===
                null
                ? "El período anterior no tenía egresos comparables, pero el nivel actual ya es material."
                : `Los egresos crecieron ${this.formatearPorcentaje(
                  egresos.variacionPorcentaje,
                )}%.`,
            evidencia:
              `${this.formatearMoneda(
                egresos.anterior,
              )} → ${this.formatearMoneda(
                egresos.actual,
              )}.`,
            path:
              "/app/caja",
            prioridad:
              88,
          }),
        );
      }
    }

    // --------------------------------------------------------
    // VENTAS: caída fuerte.
    // --------------------------------------------------------
    if (
      tendencia.ventas &&
      tendencia.ventas.totalVendido.direccion ===
      "baja" &&
      tendencia.ventas.totalVendido.variacionPorcentaje !==
      null &&
      tendencia.ventas.totalVendido.variacionPorcentaje <=
      -40 &&
      Math.abs(
        tendencia.ventas.totalVendido.diferencia,
      ) >= 100000
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "ventas_caen_fuerte",
          severidad:
            tendencia.ventas.actual.totalVendido ===
              0
              ? "critico"
              : "atencion",
          titulo:
            "Las ventas cayeron fuerte",
          detalle:
            `El monto vendido bajó ${this.formatearPorcentaje(
              tendencia.ventas.totalVendido.variacionPorcentaje,
            )}% contra el mismo tramo del mes anterior.`,
          evidencia:
            `${this.formatearMoneda(
              tendencia.ventas.totalVendido.anterior,
            )} → ${this.formatearMoneda(
              tendencia.ventas.totalVendido.actual,
            )}.`,
          path:
            "/app/ventas",
          prioridad:
            94,
        }),
      );
    }

    // --------------------------------------------------------
    // VENTAS: actividad nueva con base anterior en cero.
    // Se marca positivo, nunca como +infinito%.
    // --------------------------------------------------------
    if (
      tendencia.ventas &&
      tendencia.ventas.totalVendido.direccion ===
      "sin_base" &&
      tendencia.ventas.actual.totalVendido >=
      100000
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "ventas_nuevo_impulso",
          severidad:
            "positivo",
          titulo:
            "Apareció actividad de ventas donde antes no había",
          detalle:
            "El tramo anterior partía de cero, por eso no expreso una mejora porcentual.",
          evidencia:
            `${this.formatearMoneda(
              tendencia.ventas.anterior.totalVendido,
            )} → ${this.formatearMoneda(
              tendencia.ventas.actual.totalVendido,
            )}; ${tendencia.ventas.anterior.cantidadVentas} → ${tendencia.ventas.actual.cantidadVentas} ventas.`,
          path:
            "/app/ventas",
          prioridad:
            45,
        }),
      );
    }

    // --------------------------------------------------------
    // COBROS: caída fuerte.
    // --------------------------------------------------------
    if (
      tendencia.cobros &&
      tendencia.cobros.totalCobrado.direccion ===
      "baja" &&
      tendencia.cobros.totalCobrado.variacionPorcentaje !==
      null &&
      tendencia.cobros.totalCobrado.variacionPorcentaje <=
      -40 &&
      Math.abs(
        tendencia.cobros.totalCobrado.diferencia,
      ) >= 50000
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "cobros_caen_fuerte",
          severidad:
            "atencion",
          titulo:
            "Los cobros cayeron fuerte",
          detalle:
            `El dinero efectivamente cobrado bajó ${this.formatearPorcentaje(
              tendencia.cobros.totalCobrado.variacionPorcentaje,
            )}%.`,
          evidencia:
            `${this.formatearMoneda(
              tendencia.cobros.totalCobrado.anterior,
            )} → ${this.formatearMoneda(
              tendencia.cobros.totalCobrado.actual,
            )}.`,
          path:
            "/app/ventas",
          prioridad:
            92,
        }),
      );
    }

    if (
      tendencia.cobros &&
      tendencia.cobros.totalCobrado.direccion ===
      "sin_base" &&
      tendencia.cobros.actual.totalCobrado >=
      100000
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "cobros_nuevo_impulso",
          severidad:
            "positivo",
          titulo:
            "Aparecieron cobros donde antes no había",
          detalle:
            "El período anterior tenía cobros en cero; no uso un porcentaje infinito.",
          evidencia:
            `${this.formatearMoneda(
              tendencia.cobros.anterior.totalCobrado,
            )} → ${this.formatearMoneda(
              tendencia.cobros.actual.totalCobrado,
            )}.`,
          path:
            "/app/ventas",
          prioridad:
            40,
        }),
      );
    }

    // --------------------------------------------------------
    // VENTAS vs COBROS: cobros por debajo del 40% de ventas.
    // Sólo con ventas actuales >= $100.000.
    // --------------------------------------------------------
    if (
      tendencia.ventas &&
      tendencia.cobros &&
      tendencia.ventas.actual.totalVendido >=
      100000
    ) {
      const ratioCobrado =
        tendencia.ventas.actual.totalVendido >
          0
          ? tendencia.cobros.actual.totalCobrado /
          tendencia.ventas.actual.totalVendido
          : 1;

      if (ratioCobrado < 0.4) {
        const porcentajeCobrado =
          Math.round(
            ratioCobrado *
            10000,
          ) / 100;

        hallazgos.push(
          this.crearHallazgo({
            codigo:
              "cobros_rezagados_vs_ventas",
            severidad:
              "atencion",
            titulo:
              "Los cobros vienen rezagados respecto de las ventas",
            detalle:
              `En el tramo actual se cobró ${this.formatearPorcentaje(
                porcentajeCobrado,
              )}% de lo vendido.`,
            evidencia:
              `Ventas ${this.formatearMoneda(
                tendencia.ventas.actual.totalVendido,
              )}; cobros ${this.formatearMoneda(
                tendencia.cobros.actual.totalCobrado,
              )}.`,
            path:
              "/app/cuentas-corrientes/clientes",
            prioridad:
              86,
          }),
        );
      }
    }

    // --------------------------------------------------------
    // GASTOS: crecimiento material.
    // No se etiqueta "malo": sólo cambio relevante.
    // --------------------------------------------------------
    if (tendencia.gastos) {
      const gastos =
        tendencia.gastos.totalGastos;

      const gastoSubeConBase =
        gastos.direccion ===
        "sube" &&
        gastos.variacionPorcentaje !==
        null &&
        gastos.variacionPorcentaje >=
        50 &&
        gastos.diferencia >=
        50000;

      const gastoNuevoRelevante =
        gastos.direccion ===
        "sin_base" &&
        gastos.actual >=
        100000;

      if (
        gastoSubeConBase ||
        gastoNuevoRelevante
      ) {
        hallazgos.push(
          this.crearHallazgo({
            codigo:
              "gastos_suben_fuerte",
            severidad:
              "informativo",
            titulo:
              "Los gastos generales cambiaron de forma material",
            detalle:
              gastos.variacionPorcentaje ===
                null
                ? "No había base de gasto comparable en el tramo anterior."
                : `El gasto aumentó ${this.formatearPorcentaje(
                  gastos.variacionPorcentaje,
                )}%. Esto no implica por sí solo un problema.`,
            evidencia:
              `${this.formatearMoneda(
                gastos.anterior,
              )} → ${this.formatearMoneda(
                gastos.actual,
              )}.`,
            path:
              "/app/gastos",
            prioridad:
              55,
          }),
        );
      }
    }

    // --------------------------------------------------------
    // TICKET PROMEDIO: sólo con muestra mínima de 3 ventas
    // en ambos períodos para no exagerar muestras diminutas.
    // --------------------------------------------------------
    if (
      tendencia.ventas &&
      tendencia.ventas.actual.cantidadVentas >=
      3 &&
      tendencia.ventas.anterior.cantidadVentas >=
      3 &&
      tendencia.ventas.ticketPromedio.variacionPorcentaje !==
      null &&
      Math.abs(
        tendencia.ventas.ticketPromedio.variacionPorcentaje,
      ) >= 40
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "ticket_cambia_fuerte",
          severidad:
            "informativo",
          titulo:
            "El ticket promedio cambió fuerte",
          detalle:
            `${tendencia.ventas.ticketPromedio.direccion === "sube" ? "Subió" : "Bajó"} ${this.formatearPorcentaje(
              tendencia.ventas.ticketPromedio.variacionPorcentaje,
            )}% con una muestra mínima de 3 ventas por período.`,
          evidencia:
            `${this.formatearMoneda(
              tendencia.ventas.ticketPromedio.anterior,
            )} → ${this.formatearMoneda(
              tendencia.ventas.ticketPromedio.actual,
            )}.`,
          path:
            "/app/ventas",
          prioridad:
            50,
        }),
      );
    }

    // --------------------------------------------------------
    // Señales operativas del Pulso actual.
    // --------------------------------------------------------
    if (
      pulso.proveedores &&
      pulso.proveedores.comprasVencidas >
      0
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "proveedores_vencidos",
          severidad:
            "critico",
          titulo:
            "Hay compras vencidas con proveedores",
          detalle:
            `${pulso.proveedores.comprasVencidas} ${this.plural(
              pulso.proveedores.comprasVencidas,
              "compra vencida",
              "compras vencidas",
            )}.`,
          evidencia:
            `Importe vencido ${this.formatearMoneda(
              pulso.proveedores.importeVencido,
            )}.`,
          path:
            "/app/cuentas-corrientes/proveedores",
          prioridad:
            98,
        }),
      );
    }

    if (
      pulso.stock &&
      pulso.stock.sinStock >
      0
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "sin_stock",
          severidad:
            "critico",
          titulo:
            "Hay productos controlados sin stock",
          detalle:
            `${pulso.stock.sinStock} ${this.plural(
              pulso.stock.sinStock,
              "producto está sin existencia",
              "productos están sin existencia",
            )}.`,
          evidencia:
            pulso.stock.alertas
              .filter(
                (
                  item,
                ) =>
                  item.situacion ===
                  "sin_stock",
              )
              .slice(
                0,
                3,
              )
              .map(
                (
                  item,
                ) =>
                  `${item.nombre}: ${item.stockActual}`,
              )
              .join(
                " · ",
              ) ||
            "Revisar Stock.",
          path:
            "/app/stock",
          prioridad:
            97,
        }),
      );
    }

    if (
      pulso.stock &&
      pulso.stock.stockBajo >
      0
    ) {
      hallazgos.push(
        this.crearHallazgo({
          codigo:
            "stock_bajo",
          severidad:
            "atencion",
          titulo:
            "Hay productos en stock mínimo",
          detalle:
            `${pulso.stock.stockBajo} ${this.plural(
              pulso.stock.stockBajo,
              "producto está en o por debajo del mínimo",
              "productos están en o por debajo del mínimo",
            )}.`,
          evidencia:
            pulso.stock.alertas
              .filter(
                (
                  item,
                ) =>
                  item.situacion ===
                  "stock_bajo",
              )
              .slice(
                0,
                3,
              )
              .map(
                (
                  item,
                ) =>
                  `${item.nombre}: ${item.stockActual} / mínimo ${item.stockMinimo}`,
              )
              .join(
                " · ",
              ) ||
            "Revisar Stock.",
          path:
            "/app/stock",
          prioridad:
            84,
        }),
      );
    }

    hallazgos.sort(
      (
        a,
        b,
      ) =>
        b.prioridad -
        a.prioridad,
    );

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "negocio.hallazgos_relevantes",
      comercioId,
      criterio:
        "reglas_transparentes_sobre_periodos_comparables_y_estado_actual",
      periodoActual:
        tendencia.periodoActual,
      periodoAnterior:
        tendencia.periodoAnterior,
      hallazgos,
      fuentesDisponibles:
        Array.from(
          new Set([
            ...tendencia.fuentesDisponibles,
            ...pulso.fuentesDisponibles,
          ]),
        ),
      fuentesOmitidas:
        Array.from(
          new Set([
            ...tendencia.fuentesOmitidas,
            ...pulso.fuentesOmitidas,
          ]),
        ),
    };
  }

  private etiquetaSeveridadHallazgo(
    severidad:
      SeveridadHallazgoDrito,
  ): string {
    switch (severidad) {
      case "critico":
        return "Crítico";
      case "atencion":
        return "Atención";
      case "positivo":
        return "Señal positiva";
      default:
        return "Dato relevante";
    }
  }

  private respuestaHallazgosNegocio(
    analisis:
      AnalisisHallazgosDrito,
  ): string {
    if (
      analisis.hallazgos.length ===
      0
    ) {
      const omitidas =
        analisis.fuentesOmitidas.length >
          0
          ? ` Por permisos no incluí: ${analisis.fuentesOmitidas.join(
            ", ",
          )}.`
          : "";

      return (
        `Revisé cambios relevantes entre ${analisis.periodoActual.desde}–${analisis.periodoActual.hasta} y ${analisis.periodoAnterior.desde}–${analisis.periodoAnterior.hasta}, además del estado operativo actual. No detecté señales que superen los umbrales definidos.${omitidas}`
      );
    }

    const principales =
      analisis.hallazgos.slice(
        0,
        5,
      );

    const partes =
      principales.map(
        (
          hallazgo,
          indice,
        ) =>
          `${indice + 1}) ${this.etiquetaSeveridadHallazgo(
            hallazgo.severidad,
          )} — ${hallazgo.titulo}. ${hallazgo.detalle} Evidencia: ${hallazgo.evidencia}`,
      );

    const resto =
      analisis.hallazgos.length >
        principales.length
        ? ` Hay ${analisis.hallazgos.length - principales.length} hallazgos adicionales de menor prioridad.`
        : "";

    const omitidas =
      analisis.fuentesOmitidas.length >
        0
        ? ` Por permisos no incluí: ${analisis.fuentesOmitidas.join(
          ", ",
        )}.`
        : "";

    return (
      `Detecté ${analisis.hallazgos.length} ${this.plural(
        analisis.hallazgos.length,
        "hallazgo relevante",
        "hallazgos relevantes",
      )}. Comparo ${analisis.periodoActual.desde}–${analisis.periodoActual.hasta} contra ${analisis.periodoAnterior.desde}–${analisis.periodoAnterior.hasta} y también reviso alertas operativas actuales. ${partes.join(
        " ",
      )}${resto}${omitidas} Son señales cuantitativas y operativas; no atribuyo causas que los datos no demuestran.`
    );
  }

  private accionesHallazgosNegocio(
    analisis:
      AnalisisHallazgosDrito,
  ): DritoAssistantAction[] {
    const acciones:
      DritoAssistantAction[] =
      [];

    const paths =
      new Set<string>();

    for (
      const hallazgo of
      analisis.hallazgos
    ) {
      if (
        acciones.length >=
        3
      ) {
        break;
      }

      if (
        paths.has(
          hallazgo.path,
        )
      ) {
        continue;
      }

      paths.add(
        hallazgo.path,
      );

      const label =
        hallazgo.path ===
          "/app/caja"
          ? "Ver Caja"
          : hallazgo.path ===
            "/app/ventas"
            ? "Ver Ventas"
            : hallazgo.path ===
              "/app/gastos"
              ? "Ver Gastos"
              : hallazgo.path ===
                "/app/stock"
                ? "Ver Stock"
                : hallazgo.path.includes(
                  "clientes",
                )
                  ? "Ver clientes con deuda"
                  : "Ver proveedores";

      acciones.push({
        id:
          `hallazgo-${hallazgo.codigo}`,
        tipo:
          "navegar",
        label,
        path:
          hallazgo.path,
      });
    }

    return acciones;
  }


  private obtenerProveedorRelacionPulso(
    relacion:
      CompraCuentaProveedorPulso["proveedor"],
  ) {
    if (!relacion) {
      return null;
    }

    return Array.isArray(relacion)
      ? relacion[0] ?? null
      : relacion;
  }

  private async obtenerProveedoresConDeudaPulso(
    comercioId: string,
  ): Promise<ResumenProveedoresPulso> {
    const { data, error } =
      await this.supabase.client
        .from("compras")
        .select(`
          proveedor_id,
          total,
          total_pagado,
          fecha_vencimiento,
          estado,
          proveedor:proveedores (
            nombre,
            razon_social,
            activo
          )
        `)
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "estado",
          "confirmada",
        );

    if (error) {
      throw error;
    }

    const hoy =
      this.fechaActualArgentina();

    const porProveedor =
      new Map<
        string,
        ProveedorConDeudaPulso
      >();

    let saldoTotalPendiente = 0;
    let comprasPendientes = 0;
    let comprasVencidas = 0;
    let importeVencido = 0;

    for (
      const compra of
      (data ?? []) as unknown as CompraCuentaProveedorPulso[]
    ) {
      if (!compra.proveedor_id) {
        continue;
      }

      const total =
        Number(
          compra.total ?? 0,
        );

      const pagado =
        Number(
          compra.total_pagado ?? 0,
        );

      const saldo =
        Math.max(
          0,
          total - pagado,
        );

      if (saldo <= 0) {
        continue;
      }

      const relacion =
        this.obtenerProveedorRelacionPulso(
          compra.proveedor,
        );

      const nombre =
        relacion?.razon_social?.trim() ||
        relacion?.nombre?.trim() ||
        "Proveedor sin nombre";

      const vencida =
        Boolean(
          compra.fecha_vencimiento &&
          compra.fecha_vencimiento <
          hoy,
        );

      saldoTotalPendiente +=
        saldo;
      comprasPendientes += 1;

      if (vencida) {
        comprasVencidas += 1;
        importeVencido += saldo;
      }

      const existente =
        porProveedor.get(
          compra.proveedor_id,
        );

      if (!existente) {
        porProveedor.set(
          compra.proveedor_id,
          {
            proveedorId:
              compra.proveedor_id,
            nombre,
            saldoPendiente:
              saldo,
            comprasPendientes:
              1,
            comprasVencidas:
              vencida ? 1 : 0,
            importeVencido:
              vencida ? saldo : 0,
          },
        );

        continue;
      }

      existente.saldoPendiente +=
        saldo;
      existente.comprasPendientes +=
        1;

      if (vencida) {
        existente.comprasVencidas +=
          1;
        existente.importeVencido +=
          saldo;
      }
    }

    const proveedores =
      [...porProveedor.values()]
        .sort(
          (a, b) =>
            b.saldoPendiente -
            a.saldoPendiente,
        );

    return {
      saldoTotalPendiente,
      comprasPendientes,
      comprasVencidas,
      importeVencido,
      proveedores,
    };
  }

  private async obtenerStockPulso(
    comercioId: string,
  ): Promise<ResumenStockPulso> {
    const { data, error } =
      await this.supabase.client
        .from("productos")
        .select(
          "id, codigo, nombre, stock_actual, stock_minimo, controla_stock, activo, tipo",
        )
        .eq(
          "comercio_id",
          comercioId,
        )
        .eq(
          "activo",
          true,
        )
        .eq(
          "tipo",
          "producto",
        )
        .eq(
          "controla_stock",
          true,
        )
        .order(
          "nombre",
          {
            ascending:
              true,
          },
        );

    if (error) {
      throw error;
    }

    const productos =
      (data ??
        []) as ProductoStockPulso[];

    const alertas:
      ProductoAlertaStockPulso[] =
      [];

    let sinStock = 0;
    let stockBajo = 0;

    for (const producto of productos) {
      const stockActual =
        Number(
          producto.stock_actual ??
          0,
        );

      const stockMinimo =
        Number(
          producto.stock_minimo ??
          0,
        );

      if (stockActual <= 0) {
        sinStock += 1;

        alertas.push({
          id: producto.id,
          codigo:
            producto.codigo,
          nombre:
            producto.nombre,
          stockActual,
          stockMinimo,
          situacion:
            "sin_stock",
        });

        continue;
      }

      if (
        stockMinimo > 0 &&
        stockActual <=
        stockMinimo
      ) {
        stockBajo += 1;

        alertas.push({
          id: producto.id,
          codigo:
            producto.codigo,
          nombre:
            producto.nombre,
          stockActual,
          stockMinimo,
          situacion:
            "stock_bajo",
        });
      }
    }

    return {
      productosControlados:
        productos.length,
      sinStock,
      stockBajo,
      alertas,
    };
  }

  private async obtenerPulsoNegocio(
    user: AuthUser,
    comercioId: string,
    vinculacion: UsuarioComercio,
  ): Promise<PulsoNegocioDrito> {
    const [
      puedeVentas,
      puedeClientes,
      puedeCaja,
      puedeProveedores,
      puedeStock,
    ] =
      await Promise.all([
        this.permisoHabilitado(
          vinculacion,
          "ventas.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "cuentas_clientes.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "caja.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "cuentas_proveedores.ver",
        ),
        this.permisoHabilitado(
          vinculacion,
          "stock.ver",
        ),
      ]);

    const [
      ventas,
      clientes,
      caja,
      proveedores,
      stock,
    ] =
      await Promise.all([
        puedeVentas
          ? this.obtenerResumenVentasMes(
            user,
            comercioId,
          )
          : Promise.resolve(
            null,
          ),
        puedeClientes
          ? this.obtenerClientesConDeuda(
            user,
            comercioId,
          )
          : Promise.resolve(
            null,
          ),
        puedeCaja
          ? this.obtenerResumenCajaMes(
            user,
            comercioId,
          )
          : Promise.resolve(
            null,
          ),
        puedeProveedores
          ? this.obtenerProveedoresConDeudaPulso(
            comercioId,
          )
          : Promise.resolve(
            null,
          ),
        puedeStock
          ? this.obtenerStockPulso(
            comercioId,
          )
          : Promise.resolve(
            null,
          ),
      ]);

    const fuentesDisponibles:
      string[] = [];

    const fuentesOmitidas:
      string[] = [];

    const fuentes = [
      [
        "Ventas",
        puedeVentas,
      ],
      [
        "Cuentas de clientes",
        puedeClientes,
      ],
      [
        "Caja",
        puedeCaja,
      ],
      [
        "Cuentas de proveedores",
        puedeProveedores,
      ],
      [
        "Stock",
        puedeStock,
      ],
    ] as const;

    for (
      const [
        nombre,
        disponible,
      ] of fuentes
    ) {
      if (disponible) {
        fuentesDisponibles.push(
          nombre,
        );
      } else {
        fuentesOmitidas.push(
          nombre,
        );
      }
    }

    const alertas:
      AlertaPulsoDrito[] =
      [];

    if (
      caja &&
      caja.metricas.saldoPeriodo <
      0
    ) {
      alertas.push({
        codigo:
          "caja_negativa",
        nivel:
          "critico",
        titulo:
          "Caja del mes en negativo",
        detalle:
          `El saldo del período es ${this.formatearMoneda(
            caja.metricas.saldoPeriodo,
          )}.`,
        importe:
          caja.metricas.saldoPeriodo,
        cantidad:
          caja.metricas.movimientosRegistrados,
        path:
          "/app/caja",
        prioridad:
          100,
      });
    }

    if (
      proveedores &&
      proveedores.comprasVencidas >
      0
    ) {
      alertas.push({
        codigo:
          "proveedores_vencidos",
        nivel:
          "critico",
        titulo:
          "Compras vencidas con proveedores",
        detalle:
          `${proveedores.comprasVencidas} ${this.plural(
            proveedores.comprasVencidas,
            "compra vencida",
            "compras vencidas",
          )} por ${this.formatearMoneda(
            proveedores.importeVencido,
          )}.`,
        importe:
          proveedores.importeVencido,
        cantidad:
          proveedores.comprasVencidas,
        path:
          "/app/cuentas-corrientes/proveedores",
        prioridad:
          95,
      });
    }

    if (
      stock &&
      stock.sinStock > 0
    ) {
      alertas.push({
        codigo:
          "sin_stock",
        nivel:
          "critico",
        titulo:
          "Productos sin stock",
        detalle:
          `${stock.sinStock} ${this.plural(
            stock.sinStock,
            "producto controlado quedó sin existencia",
            "productos controlados quedaron sin existencia",
          )}.`,
        importe:
          null,
        cantidad:
          stock.sinStock,
        path:
          "/app/stock",
        prioridad:
          90,
      });
    }

    if (
      stock &&
      stock.stockBajo > 0
    ) {
      alertas.push({
        codigo:
          "stock_bajo",
        nivel:
          "atencion",
        titulo:
          "Stock bajo",
        detalle:
          `${stock.stockBajo} ${this.plural(
            stock.stockBajo,
            "producto está en o por debajo de su mínimo",
            "productos están en o por debajo de su mínimo",
          )}.`,
        importe:
          null,
        cantidad:
          stock.stockBajo,
        path:
          "/app/stock",
        prioridad:
          80,
      });
    }

    if (
      clientes &&
      clientes.metricas.saldoTotalPendiente >
      0
    ) {
      alertas.push({
        codigo:
          "clientes_por_cobrar",
        nivel:
          "atencion",
        titulo:
          "Dinero pendiente de cobro",
        detalle:
          `${this.formatearMoneda(
            clientes.metricas.saldoTotalPendiente,
          )} pendientes entre ${clientes.metricas.clientesConDeuda} ${this.plural(
            clientes.metricas.clientesConDeuda,
            "cliente",
            "clientes",
          )}.`,
        importe:
          clientes.metricas.saldoTotalPendiente,
        cantidad:
          clientes.metricas.clientesConDeuda,
        path:
          "/app/cuentas-corrientes/clientes",
        prioridad:
          70,
      });
    }

    if (
      proveedores &&
      proveedores.saldoTotalPendiente >
      0
    ) {
      alertas.push({
        codigo:
          "proveedores_por_pagar",
        nivel:
          "informativo",
        titulo:
          "Saldo pendiente con proveedores",
        detalle:
          `${this.formatearMoneda(
            proveedores.saldoTotalPendiente,
          )} en ${proveedores.comprasPendientes} ${this.plural(
            proveedores.comprasPendientes,
            "compra pendiente",
            "compras pendientes",
          )}.`,
        importe:
          proveedores.saldoTotalPendiente,
        cantidad:
          proveedores.comprasPendientes,
        path:
          "/app/cuentas-corrientes/proveedores",
        prioridad:
          60,
      });
    }

    alertas.sort(
      (a, b) => {
        if (
          b.prioridad !==
          a.prioridad
        ) {
          return (
            b.prioridad -
            a.prioridad
          );
        }

        return (
          Math.abs(
            b.importe ?? 0,
          ) -
          Math.abs(
            a.importe ?? 0,
          )
        );
      },
    );

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "negocio.pulso_hoy",
      comercioId,
      fecha:
        this.fechaActualArgentina(),
      fuentesDisponibles,
      fuentesOmitidas,
      ventas,
      clientes,
      caja,
      proveedores,
      stock,
      alertas,
    };
  }

  private respuestaPulsoNegocio(
    pulso: PulsoNegocioDrito,
  ): string {
    const partes:
      string[] = [];

    const top =
      pulso.alertas.slice(
        0,
        3,
      );

    if (top.length > 0) {
      partes.push(
        `Pulso de hoy: encontré ${pulso.alertas.length} ${this.plural(
          pulso.alertas.length,
          "frente para revisar",
          "frentes para revisar",
        )}.`,
      );

      top.forEach(
        (
          alerta,
          indice,
        ) => {
          partes.push(
            `${indice + 1}) ${alerta.titulo}: ${alerta.detalle}`,
          );
        },
      );
    } else {
      partes.push(
        "Pulso de hoy: no detecto alertas operativas en las fuentes que tu usuario puede consultar.",
      );
    }

    if (pulso.ventas) {
      partes.push(
        `Ventas del mes: ${pulso.ventas.metricas.cantidadVentas} ${this.plural(
          pulso.ventas.metricas.cantidadVentas,
          "venta",
          "ventas",
        )} por ${this.formatearMoneda(
          pulso.ventas.metricas.totalVendido,
        )}; cobrado ${this.formatearMoneda(
          pulso.ventas.metricas.totalCobrado,
        )} y pendiente ${this.formatearMoneda(
          pulso.ventas.metricas.saldoPendiente,
        )}.`,
      );
    }

    if (pulso.caja) {
      partes.push(
        `Caja del mes: ingresos ${this.formatearMoneda(
          pulso.caja.metricas.totalIngresos,
        )}, egresos ${this.formatearMoneda(
          pulso.caja.metricas.totalEgresos,
        )}, saldo del período ${this.formatearMoneda(
          pulso.caja.metricas.saldoPeriodo,
        )}.`,
      );
    }

    if (pulso.stock) {
      if (
        pulso.stock.sinStock ===
        0 &&
        pulso.stock.stockBajo ===
        0
      ) {
        partes.push(
          `Stock: ${pulso.stock.productosControlados} ${this.plural(
            pulso.stock.productosControlados,
            "producto controlado",
            "productos controlados",
          )} y no veo faltantes ni stock bajo.`,
        );
      } else {
        partes.push(
          `Stock: ${pulso.stock.sinStock} sin existencia y ${pulso.stock.stockBajo} con stock bajo.`,
        );
      }
    }

    if (
      pulso.fuentesOmitidas.length >
      0
    ) {
      partes.push(
        `Por permisos no incluí: ${pulso.fuentesOmitidas.join(
          ", ",
        )}.`,
      );
    }

    return partes.join(" ");
  }

  private accionesPulsoNegocio(
    pulso: PulsoNegocioDrito,
  ): DritoAssistantAction[] {
    const acciones:
      DritoAssistantAction[] =
      [];

    const pathsYaUsados =
      new Set<string>();

    for (
      const alerta of
      pulso.alertas
    ) {
      if (
        acciones.length >=
        3
      ) {
        break;
      }

      if (
        pathsYaUsados.has(
          alerta.path,
        )
      ) {
        continue;
      }

      pathsYaUsados.add(
        alerta.path,
      );

      const label =
        alerta.path.includes(
          "cuentas-corrientes/clientes",
        )
          ? "Ver clientes con deuda"
          : alerta.path.includes(
            "cuentas-corrientes/proveedores",
          )
            ? "Ver proveedores"
            : alerta.path ===
              "/app/stock"
              ? "Ver Stock"
              : "Ver Caja";

      acciones.push({
        id:
          `pulso-${alerta.codigo}`,
        tipo:
          "navegar",
        label,
        path:
          alerta.path,
      });
    }

    return acciones;
  }


  private async obtenerBriefingOperativo(
    user: AuthUser,
    comercioId: string,
    vinculacion: UsuarioComercio,
  ): Promise<BriefingOperativoDrito> {
    const [
      agenda,
      pulso,
      tendencia,
    ] = await Promise.all([
      this.obtenerAgendaVencimientos(
        comercioId,
        vinculacion,
      ),
      this.obtenerPulsoNegocio(
        user,
        comercioId,
        vinculacion,
      ),
      this.obtenerTendenciaNegocio(
        comercioId,
        vinculacion,
      ),
    ]);

    const fuentesDisponibles =
      Array.from(
        new Set([
          ...agenda.fuentesDisponibles,
          ...pulso.fuentesDisponibles,
          ...tendencia.fuentesDisponibles,
        ]),
      );

    const fuentesOmitidas =
      Array.from(
        new Set([
          ...agenda.fuentesOmitidas,
          ...pulso.fuentesOmitidas,
          ...tendencia.fuentesOmitidas,
        ]),
      ).filter(
        (fuente) =>
          !fuentesDisponibles.includes(
            fuente,
          ),
      );

    return {
      ok: true,
      soloLectura: true,
      herramienta:
        "negocio.briefing_operativo",
      comercioId,
      fecha:
        this.fechaActualArgentina(),
      criterio:
        "estado_actual_mas_vencimientos_y_comparacion_temporal_sin_inferir_causas",
      agenda,
      pulso,
      tendencia,
      fuentesDisponibles,
      fuentesOmitidas,
    };
  }

  private respuestaBriefingOperativo(
    briefing: BriefingOperativoDrito,
  ): string {
    const partes: string[] = [];

    partes.push(
      `Parte operativo de hoy (${briefing.fecha}).`,
    );

    const cantidadVencidos =
      briefing.agenda.vencidos.length;
    const cantidadHoy =
      briefing.agenda.vencenHoy.length;
    const cantidadProximos =
      briefing.agenda.proximos.length;

    if (
      cantidadVencidos > 0 ||
      cantidadHoy > 0 ||
      cantidadProximos > 0
    ) {
      partes.push(
        `Agenda: ${cantidadVencidos} ${this.plural(
          cantidadVencidos,
          "vencido",
          "vencidos",
        )}, ${cantidadHoy} ${this.plural(
          cantidadHoy,
          "vence hoy",
          "vencen hoy",
        )} y ${cantidadProximos} ${this.plural(
          cantidadProximos,
          "vencimiento próximo",
          "vencimientos próximos",
        )} dentro de los próximos ${briefing.agenda.ventanaDias} días.`,
      );

      const primero =
        briefing.agenda.vencidos[0] ??
        briefing.agenda.vencenHoy[0] ??
        briefing.agenda.proximos[0] ??
        null;

      if (primero) {
        const estado =
          primero.estadoTemporal ===
            "vencido"
            ? `venció el ${primero.fechaVencimiento}`
            : primero.estadoTemporal ===
              "vence_hoy"
              ? `vence hoy (${primero.fechaVencimiento})`
              : `vence el ${primero.fechaVencimiento}`;

        partes.push(
          `Referencia más inmediata: ${primero.documentoInterno} · ${primero.contraparteNombre} · ${this.formatearMoneda(
            primero.saldoPendiente,
          )}; ${estado}.`,
        );
      }
    } else {
      partes.push(
        `Agenda: no encontré vencimientos explícitos vencidos, para hoy ni dentro de los próximos ${briefing.agenda.ventanaDias} días.`,
      );
    }

    const saldosSinFecha =
      briefing.agenda.clientesConSaldoSinFecha +
      briefing.agenda.proveedoresConSaldoSinFecha;

    if (saldosSinFecha > 0) {
      partes.push(
        `Además hay ${briefing.agenda.clientesConSaldoSinFecha} ${this.plural(
          briefing.agenda.clientesConSaldoSinFecha,
          "cliente con saldo sin fecha",
          "clientes con saldo sin fecha",
        )} y ${briefing.agenda.proveedoresConSaldoSinFecha} ${this.plural(
          briefing.agenda.proveedoresConSaldoSinFecha,
          "proveedor con saldo sin fecha",
          "proveedores con saldo sin fecha",
        )}. No los marco como vencidos porque no tienen una fecha registrada.`,
      );
    }

    const alertas =
      briefing.pulso.alertas.slice(
        0,
        3,
      );

    if (alertas.length > 0) {
      partes.push(
        `Pulso: ${alertas
          .map(
            (alerta) =>
              `${alerta.titulo}: ${alerta.detalle}`,
          )
          .join(" ")}`,
      );
    } else {
      partes.push(
        "Pulso: no detecto alertas operativas en las fuentes que tu usuario puede consultar.",
      );
    }

    const tendenciaPartes: string[] = [];

    if (briefing.tendencia.ventas) {
      tendenciaPartes.push(
        `ventas ${this.describirComparacionMonetaria(
          briefing.tendencia.ventas.totalVendido,
        )}`,
      );
    }

    if (briefing.tendencia.cobros) {
      tendenciaPartes.push(
        `cobros ${this.describirComparacionMonetaria(
          briefing.tendencia.cobros.totalCobrado,
        )}`,
      );
    }

    if (briefing.tendencia.caja) {
      tendenciaPartes.push(
        `saldo de Caja ${this.formatearMoneda(
          briefing.tendencia.caja.actual.saldo,
        )} frente a ${this.formatearMoneda(
          briefing.tendencia.caja.anterior.saldo,
        )} en el tramo comparable`,
      );
    }

    if (tendenciaPartes.length > 0) {
      partes.push(
        `Comparación con el mismo tramo del mes anterior: ${tendenciaPartes.join(
          "; ",
        )}.`,
      );
    }

    if (
      briefing.fuentesOmitidas.length >
      0
    ) {
      partes.push(
        `Por permisos no incluí: ${briefing.fuentesOmitidas.join(
          ", ",
        )}.`,
      );
    }

    partes.push(
      "Este parte describe datos y cambios verificables; no atribuye causas ni decide qué acción comercial tomar.",
    );

    return partes.join(" ");
  }

  private accionesBriefingOperativo(
    briefing: BriefingOperativoDrito,
  ): DritoAssistantAction[] {
    const candidatas: DritoAssistantAction[] = [
      ...this.accionesAgendaVencimientos(
        briefing.agenda,
      ),
      ...this.accionesPulsoNegocio(
        briefing.pulso,
      ),
      ...this.accionesTendenciaNegocio(
        briefing.tendencia,
        "resumen completo del negocio",
      ),
    ];

    const acciones: DritoAssistantAction[] = [];
    const rutas = new Set<string>();

    for (const accion of candidatas) {
      if (
        accion.tipo !== "navegar" ||
        rutas.has(accion.path)
      ) {
        continue;
      }

      rutas.add(accion.path);
      acciones.push(accion);

      if (acciones.length >= 3) {
        break;
      }
    }

    return acciones;
  }


  async procesarMensaje(
    user: AuthUser,
    comercioId: string,
    body: DritoAssistantMessageDto,
  ) {
    // Incluso para consultas aún no soportadas validamos que el
    // usuario tenga acceso real a la empresa indicada.
    const vinculacion =
      await this.obtenerVinculacionActiva(
        user.id,
        comercioId,
      );

    const texto =
      this.normalizarTexto(body.mensaje);

    const modulo =
      this.normalizarTexto(body.modulo ?? "");








    // ========================================================
    // 21A.6.6e.2 — contexto explícito de empresa / Cuenta Drito
    // ========================================================
    // Esta intención no depende de datos operativos. Sirve para
    // comprobar qué empresa y qué Cuenta Drito están activas en
    // la sesión actual, especialmente en escenarios Multiempresa.
    const pideContextoEmpresa =
      texto.includes("en que empresa estoy") ||
      texto.includes("que empresa estoy usando") ||
      texto.includes("cual es la empresa activa") ||
      texto.includes("nombre de la empresa activa") ||
      texto.includes("en que comercio estoy") ||
      texto.includes("cual es el comercio activo") ||
      texto.includes("en que cuenta drito estoy") ||
      texto.includes("cual es mi cuenta drito");

    if (pideContextoEmpresa) {
      const contexto =
        await this.obtenerContextoSeguro(
          user,
          comercioId,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "contexto.empresa_activa",
        respuesta:
          `Estás trabajando en ${contexto.comercio.nombre}, dentro de la Cuenta Drito ${contexto.cuentaDrito.nombre}.`,
        herramienta: {
          cuentaDrito:
            contexto.cuentaDrito,
          comercio:
            contexto.comercio,
        },
      };
    }

    const pideBriefingOperativo =
      texto.includes(
        "dame el parte de hoy",
      ) ||
      texto.includes(
        "parte de hoy",
      ) ||
      texto.includes(
        "parte operativo",
      ) ||
      texto.includes(
        "briefing de hoy",
      ) ||
      texto.includes(
        "dame el briefing",
      ) ||
      texto.includes(
        "resumen completo del negocio",
      ) ||
      texto.includes(
        "dame un resumen completo",
      ) ||
      texto.includes(
        "panorama de hoy",
      );

    if (pideBriefingOperativo) {
      const briefing =
        await this.obtenerBriefingOperativo(
          user,
          comercioId,
          vinculacion,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "negocio.briefing_operativo",
        respuesta:
          this.respuestaBriefingOperativo(
            briefing,
          ),
        herramienta:
          briefing,
        acciones:
          this.accionesBriefingOperativo(
            briefing,
          ),
      };
    }


    const pideRegistrarCompra =
      /\b(registra|registrame|crea|creame|carga|cargame|anota|anotame)\b/.test(
        texto,
      ) &&
      /\bcompra\b/.test(
        texto,
      ) &&
      /\b\d+(?:[.,]\d+)?\b/.test(
        body.mensaje,
      );

    if (pideRegistrarCompra) {
      return this.prepararCompraDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
      );
    }

    const pideRegistrarPagoProveedor =
      (
        /\b(registra|registrame|carga|cargame|anota|anotame)\b/.test(
          texto,
        ) &&
        /\bpago\b/.test(
          texto,
        ) &&
        /\b(a|para)\b/.test(
          texto,
        )
      ) ||
      /\b(pagale|paga|abona|abonale)\b/.test(
        texto,
      );

    if (
      pideRegistrarPagoProveedor &&
      /\b\d+(?:[.,]\d+)?\b/.test(
        body.mensaje,
      )
    ) {
      return this.prepararPagoProveedorDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
      );
    }

    const pideRegistrarGasto =
      /\b(registra|registrame|carga|cargame|anota|anotame)\b/.test(
        texto,
      ) &&
      /\bgasto\b/.test(
        texto,
      ) &&
      /\b\d+(?:[.,]\d+)?\b/.test(
        body.mensaje,
      );

    if (pideRegistrarGasto) {
      return this.prepararGastoDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
      );
    }

    const pideEjecutarAjusteStock =
      /\b(ajusta|ajustame|corrige|corregime)\b/.test(
        texto,
      ) &&
      /\b(stock|inventario|existencias)\b/.test(
        texto,
      ) &&
      /\b\d+(?:[.,]\d+)?\b/.test(
        body.mensaje,
      );

    if (pideEjecutarAjusteStock) {
      return this.prepararAjusteStockDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
      );
    }

    const pideEjecutarSalidaStock =
      /\b(saca|sacame|retira|retirame|egresa|egresame|quita|quitame|descuenta|descontame)\b/.test(
        texto,
      ) &&
      /\b(stock|inventario|existencias)\b/.test(
        texto,
      ) &&
      /\b\d+(?:[.,]\d+)?\b/.test(
        body.mensaje,
      );

    if (pideEjecutarSalidaStock) {
      return this.prepararSalidaStockDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
      );
    }

    const pideEjecutarIngresoStock =
      /\b(ingresa|ingresame|suma|sumame|carga|cargame|agrega|agregame|anade|anademe)\b/.test(
        texto,
      ) &&
      /\b(stock|inventario|existencias)\b/.test(
        texto,
      ) &&
      /\b\d+(?:[.,]\d+)?\b/.test(
        body.mensaje,
      );

    if (pideEjecutarIngresoStock) {
      return this.prepararIngresoStockDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
      );
    }

    const pideEjecutarCobro =
      (
        /\b(registra|registrame|carga|cargame|anota|anotame|cobra|cobrale)\b/.test(
          texto,
        )
      ) &&
      (
        /\b(cobro|pago)\b/.test(
          texto,
        ) ||
        /\bvta[- ]?\d+\b/.test(
          texto,
        )
      ) &&
      /\bvta[- ]?\d+\b/.test(
        texto,
      );

    if (pideEjecutarCobro) {
      return this.prepararCobroDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
      );
    }

    const pideEjecutarVenta =
      (
        /\b(vende|vendeme|vendele)\b/.test(
          texto,
        ) ||
        (
          /\b(creame|crea|registrame|registra|haceme|hace)\b/.test(
            texto,
          ) &&
          /\bventa\b/.test(
            texto,
          )
        )
      ) &&
      /\b\d+(?:[.,]\d+)?\b/.test(
        body.mensaje,
      );

    if (pideEjecutarVenta) {
      return this.prepararVentaDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
        "ejecucion",
      );
    }

    const pidePrepararVenta =
      /\b(preparame|prepara|armame|arma)\b/.test(
        texto,
      ) &&
      (
        /\b(venta|vender)\b/.test(
          texto,
        ) ||
        (
          modulo === "ventas" &&
          /\b\d+(?:[.,]\d+)?\b/.test(
            body.mensaje,
          )
        )
      );

    if (pidePrepararVenta) {
      return this.prepararVentaDesdeMensaje(
        comercioId,
        vinculacion,
        body.mensaje,
      );
    }






    const clienteRecordatorio =
      this.extraerClienteRecordatorio(
        body.mensaje,
      );

    if (clienteRecordatorio) {
      return this.prepararRecordatorioPagoCliente(
        comercioId,
        vinculacion,
        clienteRecordatorio,
      );
    }

    const pideAgendaVencimientos =
      texto.includes(
        "que tengo pendiente",
      ) ||
      texto.includes(
        "que pendientes tengo",
      ) ||
      texto.includes(
        "que vence",
      ) ||
      texto.includes(
        "que esta vencido",
      ) ||
      texto.includes(
        "que está vencido",
      ) ||
      texto.includes(
        "vencimientos",
      ) ||
      texto.includes(
        "agenda de vencimientos",
      ) ||
      texto.includes(
        "proximos vencimientos",
      ) ||
      texto.includes(
        "próximos vencimientos",
      ) ||
      texto.includes(
        "cobros vencidos",
      ) ||
      texto.includes(
        "pagos vencidos",
      );

    if (
      pideAgendaVencimientos
    ) {
      const agenda =
        await this.obtenerAgendaVencimientos(
          comercioId,
          vinculacion,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "negocio.agenda_vencimientos",
        respuesta:
          this.respuestaAgendaVencimientos(
            agenda,
          ),
        herramienta:
          agenda,
        acciones:
          this.accionesAgendaVencimientos(
            agenda,
          ),
      };
    }


    const pidePrioridadesOperativas =
      texto.includes(
        "ordename los pendientes",
      ) ||
      texto.includes(
        "que requiere atencion ahora",
      ) ||
      texto.includes(
        "que requiere atención ahora",
      ) ||
      texto.includes(
        "que atiendo primero",
      ) ||
      texto.includes(
        "prioridades operativas",
      ) ||
      texto.includes(
        "bandeja operativa",
      );

    if (
      pidePrioridadesOperativas
    ) {
      const bandeja =
        await this.obtenerPrioridadesOperativas(
          user,
          comercioId,
          vinculacion,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "negocio.prioridades_operativas",
        respuesta:
          this.respuestaPrioridadesOperativas(
            bandeja,
          ),
        herramienta:
          bandeja,
        acciones:
          this.accionesPrioridadesOperativas(
            bandeja,
          ),
      };
    }


    const pideHallazgosNegocio =
      texto.includes(
        "hay algo raro",
      ) ||
      texto.includes(
        "ves algo raro",
      ) ||
      texto.includes(
        "detecta anomalias",
      ) ||
      texto.includes(
        "detecta anomalias en el negocio",
      ) ||
      texto.includes(
        "alguna anomalia",
      ) ||
      texto.includes(
        "que se salio de lo normal",
      ) ||
      texto.includes(
        "que se salió de lo normal",
      ) ||
      texto.includes(
        "cambios relevantes",
      ) ||
      texto.includes(
        "hallazgos relevantes",
      ) ||
      texto.includes(
        "que te llama la atencion",
      ) ||
      texto.includes(
        "que te llama la atención",
      );

    if (
      pideHallazgosNegocio
    ) {
      const analisis =
        await this.obtenerHallazgosNegocio(
          user,
          comercioId,
          vinculacion,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "negocio.hallazgos_relevantes",
        respuesta:
          this.respuestaHallazgosNegocio(
            analisis,
          ),
        herramienta:
          analisis,
        acciones:
          this.accionesHallazgosNegocio(
            analisis,
          ),
      };
    }


    const rangoComparativoDetectado =
      this.rangoComparativoMesesArgentina();

    const nombreMesAnterior =
      this.normalizarTexto(
        rangoComparativoDetectado
          .anterior
          .etiqueta
          .split(" ")[0] ??
        "",
      );

    const mencionaMesAnterior =
      Boolean(
        nombreMesAnterior &&
        texto.includes(
          nombreMesAnterior,
        ),
      );

    const pideTendenciaNegocio =
      texto.includes(
        "mes pasado",
      ) ||
      texto.includes(
        "mes anterior",
      ) ||
      texto.includes(
        "contra el anterior",
      ) ||
      texto.includes(
        "contra el mes anterior",
      ) ||
      texto.includes(
        "comparame",
      ) ||
      texto.includes(
        "compara este mes",
      ) ||
      texto.includes(
        "que cambio respecto",
      ) ||
      texto.includes(
        "que cambió respecto",
      ) ||
      texto.includes(
        "estoy vendiendo mejor",
      ) ||
      texto.includes(
        "estoy vendiendo peor",
      ) ||
      texto.includes(
        "estoy cobrando mejor",
      ) ||
      texto.includes(
        "estoy cobrando peor",
      ) ||
      (
        mencionaMesAnterior &&
        (
          texto.includes(
            "respecto",
          ) ||
          texto.includes(
            "compar",
          ) ||
          texto.includes(
            "cambio",
          ) ||
          texto.includes(
            "cambió",
          )
        )
      );

    if (
      pideTendenciaNegocio
    ) {
      const tendencia =
        await this.obtenerTendenciaNegocio(
          comercioId,
          vinculacion,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "negocio.tendencia_mes",
        respuesta:
          this.respuestaTendenciaNegocio(
            tendencia,
            body.mensaje,
          ),
        herramienta:
          tendencia,
        acciones:
          this.accionesTendenciaNegocio(
            tendencia,
            body.mensaje,
          ),
      };
    }

    const pidePulsoNegocio =
      texto.includes(
        "que deberia revisar hoy",
      ) ||
      texto.includes(
        "que tengo que revisar hoy",
      ) ||
      texto.includes(
        "analiza mi negocio",
      ) ||
      texto.includes(
        "analizame el negocio",
      ) ||
      texto.includes(
        "analiza el negocio",
      ) ||
      texto.includes(
        "resumen del negocio",
      ) ||
      texto.includes(
        "resumime el negocio",
      ) ||
      texto.includes(
        "como esta el negocio",
      ) ||
      texto.includes(
        "pulso del negocio",
      ) ||
      texto === "pulso" ||
      (
        modulo ===
        "panel principal" &&
        texto.includes(
          "que deberia revisar",
        )
      );

    if (pidePulsoNegocio) {
      const pulso =
        await this.obtenerPulsoNegocio(
          user,
          comercioId,
          vinculacion,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "negocio.pulso_hoy",
        respuesta:
          this.respuestaPulsoNegocio(
            pulso,
          ),
        herramienta:
          pulso,
        acciones:
          this.accionesPulsoNegocio(
            pulso,
          ),
      };
    }

    const pideGuiaVenta =
      (
        /\b(como|guiame|ayudame|quiero|necesito)\b/.test(
          texto,
        ) &&
        /\b(venta|vender)\b/.test(texto)
      ) ||
      texto.includes("hacer una venta") ||
      texto.includes("cargar una venta") ||
      texto.includes("registrar una venta");

    if (pideGuiaVenta) {
      const puedeCrearVenta =
        await this.permisoHabilitado(
          vinculacion,
          "ventas.crear",
        );

      if (!puedeCrearVenta) {
        return {
          ok: true,
          soloLectura: true,
          intencion: "guia.venta_sin_permiso",
          respuesta:
            "Puedo explicarte el circuito de una venta, pero tu usuario no tiene permiso para crear ventas en esta empresa. Si necesitás hacerlo, un administrador debe habilitar el permiso ventas.crear.",
          acciones: [] as DritoAssistantAction[],
        };
      }

      return {
        ok: true,
        soloLectura: true,
        intencion: "guia.crear_venta",
        respuesta:
          "Te acompaño. Para registrar una venta: primero abrí Nueva venta, elegí el cliente, agregá los productos o servicios, revisá cantidades y precios y recién al final confirmá la operación. Puedo abrirte directamente el formulario; nada se guarda hasta que vos lo confirmes.",
        acciones: [
          {
            id: "abrir-nueva-venta",
            tipo: "navegar",
            label: "Abrir Nueva venta",
            path: "/app/ventas?drito=nueva-venta",
            guia: "venta",
          },
        ] satisfies DritoAssistantAction[],
      };
    }

    const pideGuiaStock =
      (
        /\b(como|guiame|ayudame|quiero|necesito)\b/.test(
          texto,
        ) &&
        /\b(stock|mercaderia|existencias)\b/.test(
          texto,
        )
      ) ||
      texto.includes("agregar stock") ||
      texto.includes("anadir stock") ||
      texto.includes("añadir stock") ||
      texto.includes("cargar stock") ||
      texto.includes("ingresar mercaderia") ||
      texto.includes("sumar stock") ||
      texto.includes("producto a stock");

    if (pideGuiaStock) {
      const puedeIngresarStock =
        await this.permisoHabilitado(
          vinculacion,
          "stock.registrar_ingreso",
        );

      const puedeCrearCompra =
        await this.permisoHabilitado(
          vinculacion,
          "compras.crear",
        );

      const acciones: DritoAssistantAction[] = [];

      if (puedeIngresarStock) {
        acciones.push({
          id: "abrir-movimiento-stock",
          tipo: "navegar",
          label: "Abrir movimiento de stock",
          path: "/app/stock?drito=nuevo-movimiento",
          guia: "stock_ingreso",
        });
      }

      if (puedeCrearCompra) {
        acciones.push({
          id: "ir-a-compras",
          tipo: "navegar",
          label: "Ir a Compras",
          path: "/app/compras",
        });
      }

      if (!puedeIngresarStock && !puedeCrearCompra) {
        return {
          ok: true,
          soloLectura: true,
          intencion: "guia.stock_sin_permiso",
          respuesta:
            "Puedo explicarte cómo se actualiza el stock, pero tu usuario no tiene permiso para registrar ingresos de stock ni crear compras en esta empresa.",
          acciones,
        };
      }

      return {
        ok: true,
        soloLectura: true,
        intencion: "guia.ingreso_stock",
        respuesta:
          "Si el producto ya existe y querés sumar unidades manualmente, usá Stock → Nuevo movimiento y elegí una entrada. Si la mercadería llegó por una compra a proveedor, conviene registrarla desde Compras para mantener la trazabilidad. Puedo llevarte al lugar correcto.",
        acciones,
      };
    }

    const pideAccionSensible =
      /\b(facturame|facturar|emitir|registrar|anular|borrar|eliminar|editar|modificar|crear)\b/.test(
        texto,
      );

    if (pideAccionSensible) {
      return {
        ok: true,
        soloLectura: true,
        intencion: "accion_no_disponible",
        respuesta:
          "Esa acción todavía no está habilitada desde Drito Chat. Ya puedo crear ventas y compras, registrar cobros, gestionar stock, registrar gastos y pagar cuentas de proveedores con confirmación fuerte, pero no voy a ejecutar otras modificaciones, anulaciones ni emisiones fiscales hasta que cada circuito tenga su validación específica.",
      };
    }

    const pideBuscarVenta =
      /\bvta[- ]?\d+\b/.test(texto) ||
      (
        (
          modulo === "ventas" ||
          /\b(venta|ventas)\b/.test(
            texto,
          )
        ) &&
        /\b(busca|buscar|buscame|numero)\b/.test(
          texto,
        )
      );

    if (pideBuscarVenta) {
      return {
        ok: true,
        soloLectura: true,
        intencion: "ventas.buscar_no_disponible",
        respuesta:
          "Todavía no tengo habilitada la búsqueda de una venta por número. Esa será otra herramienta de solo lectura; por ahora sí puedo resumirte las ventas y cobranzas del mes.",
      };
    }


    const moduloCaja =
      modulo === "caja";

    const hablaCaja =
      /\b(caja|saldo|ingreso|ingresos|entro|entraron|egreso|egresos|salio|salieron|gaste|gastamos|movimiento|movimientos)\b/.test(
        texto,
      ) ||
      texto.includes(
        "mayores egresos",
      ) ||
      texto.includes(
        "mayor egreso",
      );

    const mencionaCaja =
      /\bcaja\b/.test(texto);

    const intencionCaja =
      (moduloCaja && hablaCaja) ||
      (mencionaCaja && hablaCaja) ||
      texto.includes(
        "mayores egresos de caja",
      );

    if (intencionCaja) {
      const resumen =
        await this.obtenerResumenCajaMes(
          user,
          comercioId,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "caja.resumen_mes",
        respuesta:
          this.respuestaResumenCaja(
            resumen,
            texto,
          ),
        herramienta: resumen,
      };
    }

    const moduloCuentaClientes =
      modulo ===
      "cuenta corriente de clientes";

    const mencionaVentasExplicitas =
      /\b(venta|ventas|vendi|vendido|vendimos)\b/.test(
        texto,
      );

    const mencionaCliente =
      /\b(cliente|clientes)\b/.test(
        texto,
      );

    const mencionaDeudaCliente =
      /\b(debe|deben|deuda|deudas|saldo|saldos|moroso|morosos)\b/.test(
        texto,
      ) ||
      texto.includes("me debe") ||
      texto.includes("me deben") ||
      texto.includes("por cobrar");

    const fraseDeudores =
      texto.includes("quien me debe") ||
      texto.includes("quienes me deben") ||
      texto.includes("me deben plata") ||
      texto.includes("clientes con saldo") ||
      texto.includes("clientes con deuda") ||
      texto.includes("mayores saldos");

    const pideTotalPorCobrarGeneral =
      texto.includes(
        "cuanto tengo por cobrar",
      ) &&
      modulo !== "ventas";

    if (
      (
        moduloCuentaClientes &&
        !mencionaVentasExplicitas
      ) ||
      fraseDeudores ||
      pideTotalPorCobrarGeneral ||
      (
        mencionaCliente &&
        mencionaDeudaCliente
      )
    ) {
      const resumen =
        await this.obtenerClientesConDeuda(
          user,
          comercioId,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "cuentas_clientes.deudores",
        respuesta:
          this.respuestaClientesConDeuda(
            resumen,
          ),
        herramienta: resumen,
      };
    }

    const hablaVentas =
      /\b(venta|ventas|vendi|vendido|vendimos|cobre|cobrado|cobrar|cobranza|saldo|pendiente|pendientes)\b/.test(
        texto,
      );

    const hablaResumen =
      /\b(mes|este mes|cuanto|total|resumen|como vengo|falta cobrar|pendiente|pendientes|cobrado|cobre)\b/.test(
        texto,
      );

    const intencionVentasMes =
      (modulo === "ventas" &&
        hablaVentas &&
        !pideBuscarVenta) ||
      (hablaVentas && hablaResumen);

    if (intencionVentasMes) {
      const resumen =
        await this.obtenerResumenVentasMes(
          user,
          comercioId,
        );

      return {
        ok: true,
        soloLectura: true,
        intencion:
          "ventas.resumen_mes",
        respuesta:
          this.respuestaResumenVentas(
            resumen,
            texto,
          ),
        herramienta: resumen,
      };
    }

    return {
      ok: true,
      soloLectura: true,
      intencion: "no_soportada",
      respuesta:
        "Todavía estoy aprendiendo herramientas de Drito. Ya puedo darte un Pulso, comparar períodos, detectar cambios relevantes y consultar una agenda de vencimientos basada únicamente en fechas explícitas de cobros y pagos. También puedo preparar recordatorios de pago por WhatsApp sin enviarlos automáticamente. No voy a inventar fechas, causas ni datos que no estén registrados.",
    };
  }
}
