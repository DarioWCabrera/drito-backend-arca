import { IsOptional, Matches } from "class-validator";
import { AmbienteQueryDto } from "./ambiente-query.dto";

export class CondicionIvaQueryDto extends AmbienteQueryDto {
  @IsOptional()
  @Matches(/^[A-Za-z0-9]{1,5}$/, {
    message:
      "clase debe ser una clase de comprobante válida, por ejemplo C, B, A o ALEY",
  })
  clase?: string;
}
