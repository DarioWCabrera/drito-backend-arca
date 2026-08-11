import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import type { AmbienteArca } from "../types/arca.types";

export class UploadCredentialsDto {
  @IsIn(["homologacion", "produccion"])
  ambiente: AmbienteArca;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  alias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  passphrase?: string;
}
