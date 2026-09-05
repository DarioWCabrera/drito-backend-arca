import { Type } from "class-transformer";
import { IsIn, IsInt, Min } from "class-validator";
import type { AmbienteArca } from "../types/arca.types";

export class UltimoAutorizadoQueryDto {
  @IsIn(["homologacion", "produccion"])
  ambiente: AmbienteArca;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  puntoVenta: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  tipoComprobante: number;
}
