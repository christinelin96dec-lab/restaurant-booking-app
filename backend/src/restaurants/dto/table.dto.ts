import { TableType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @IsEnum(TableType)
  type!: TableType;

  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  capacity!: number;
}

export class UpdateTableDto {
  @IsOptional()
  @IsEnum(TableType)
  type?: TableType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
