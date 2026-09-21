import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { PresignUploadDto } from './dto/presign-upload.dto';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  presign(@Body() dto: PresignUploadDto) {
    return this.uploadsService.createPresignedUpload(dto.folder, dto.contentType);
  }
}
