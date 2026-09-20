import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateRestaurantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  cuisineTypes?: string[];

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  priceRange?: number;

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsArray()
  amenities?: string[];

  @IsOptional()
  @IsObject()
  openingHours?: Record<string, unknown>;

  // Name and city changes are flagged for platform moderation rather than
  // applied immediately — see docs/PRODUCT_SPEC.md §2.6.
}
