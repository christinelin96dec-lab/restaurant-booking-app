import { IsIn, IsString } from 'class-validator';

export class PresignUploadDto {
  @IsIn(['restaurants', 'menu-items', 'reviews'])
  folder!: 'restaurants' | 'menu-items' | 'reviews';

  @IsString()
  contentType!: string;
}
