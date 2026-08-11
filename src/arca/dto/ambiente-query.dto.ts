import { IsIn } from "class-validator";
import type { AmbienteArca } from "../types/arca.types";

export class AmbienteQueryDto {
  @IsIn(["homologacion", "produccion"])
  ambiente: AmbienteArca;
}
