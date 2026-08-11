import type { AmbienteArca } from "../types/arca.types";

export type WsaaServiceName = "wsfe";

export type WsaaTicket = {
  ambiente: AmbienteArca;
  servicio: WsaaServiceName;
  token: string;
  sign: string;
  generationTime: Date;
  expirationTime: Date;
};

export type WsaaSafeResult = {
  ok: true;
  ambiente: AmbienteArca;
  servicio: WsaaServiceName;
  ticket: "vigente";
  origen: "wsaa" | "cache";
  generationTime: string;
  expirationTime: string;
};