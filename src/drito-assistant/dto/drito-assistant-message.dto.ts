import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class DritoAssistantMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  mensaje!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  modulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  pathname?: string;
}
