import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from "class-validator";

export class PrepararCaeCDto {
  @IsInt()
  @Min(1)
  puntoVenta!: number;

  @IsIn([11, 12, 13, 15])
  tipoComprobante!: number;

  @IsIn([1, 2, 3])
  concepto!: number;

  @IsInt()
  @Min(0)
  docTipo!: number;

  @IsString()
  @Matches(/^\d{1,20}$/, {
    message: "docNro debe contener solo dígitos",
  })
  docNro!: string;

  @IsInt()
  @Min(1)
  condicionIvaReceptorId!: number;

  @IsString()
  @Matches(/^\d{8}$/, {
    message: "fechaComprobante debe tener formato yyyymmdd",
  })
  fechaComprobante!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  importeNeto!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  importeTributos?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, {
    message: "fechaServicioDesde debe tener formato yyyymmdd",
  })
  fechaServicioDesde?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, {
    message: "fechaServicioHasta debe tener formato yyyymmdd",
  })
  fechaServicioHasta?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/, {
    message: "fechaVencimientoPago debe tener formato yyyymmdd",
  })
  fechaVencimientoPago?: string;
}
