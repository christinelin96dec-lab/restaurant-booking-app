import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PRESIGN_EXPIRY_SECONDS = 300;

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', '');
    this.publicUrlBase = this.config.get<string>('S3_PUBLIC_URL_BASE', `https://${this.bucket}.s3.amazonaws.com`);
    this.s3 = new S3Client({
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      // Falls back to the default AWS credential provider chain (env vars, IAM role, etc.)
      // if S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY aren't set — see docs/DEPLOYMENT.md.
      credentials:
        this.config.get('S3_ACCESS_KEY_ID') && this.config.get('S3_SECRET_ACCESS_KEY')
          ? {
              accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID')!,
              secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY')!,
            }
          : undefined,
    });
  }

  /**
   * Returns a short-lived presigned PUT URL the client uploads directly to (never
   * proxying the image bytes through our API), plus the public URL to store once
   * the upload succeeds. `folder` scopes where the file lands and is restricted to
   * a small allowlist by the DTO, not user-supplied free text.
   */
  async createPresignedUpload(folder: 'restaurants' | 'menu-items' | 'reviews', contentType: string) {
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException(`Unsupported content type: ${contentType}`);
    }
    const extension = contentType.split('/')[1];
    const key = `${folder}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });

    return { uploadUrl, publicUrl: `${this.publicUrlBase}/${key}`, key };
  }
}
