import {
  IsOptional,
  IsUUID,
} from "class-validator";
import { PrepararCaeCDto } from "./preparar-cae-c.dto";

export class EmitirCaeCIdempotenteDto extends PrepararCaeCDto {
  @IsUUID("4", {
    message: "claveIdempotencia debe ser un UUID v4 válido",
  })
  claveIdempotencia!: string;

  @IsOptional()
  @IsUUID("4", {
    message: "ventaId debe ser un UUID v4 válido",
  })
  ventaId?: string;

  @IsOptional()
  @IsUUID("4", {
    message: "clienteId debe ser un UUID v4 válido",
  })
  clienteId?: string;
}
