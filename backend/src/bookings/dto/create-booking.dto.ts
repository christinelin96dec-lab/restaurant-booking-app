import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  restaurantId!: string;

  @IsString()
  tableId!: string;

  @IsInt()
  @Min(1)
  partySize!: number;

  @IsDateString()
  date!: string;

  @IsDateString()
  slotStart!: string;

  @IsDateString()
  slotEnd!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
