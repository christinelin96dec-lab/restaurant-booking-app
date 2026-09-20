import { BulkOrderType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBulkOrderDto {
  @IsString()
  restaurantId!: string;

  @IsString()
  packageId!: string;

  @IsEnum(BulkOrderType)
  type!: BulkOrderType;

  @IsInt()
  @Min(1)
  guestCount!: number;

  @IsDateString()
  eventDate!: string;

  @IsString()
  eventAddress!: string;

  @IsString()
  eventCity!: string;

  @IsOptional()
  @IsString()
  donationRecipientName?: string;

  @IsOptional()
  @IsString()
  donationRecipientAddress?: string;
}
