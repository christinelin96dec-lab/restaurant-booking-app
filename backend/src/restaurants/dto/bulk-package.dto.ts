import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBulkPackageDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  pricePerHeadCents!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsInt()
  @Min(1)
  minGuests!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;
}

export class UpdateBulkPackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pricePerHeadCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minGuests?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxGuests?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
