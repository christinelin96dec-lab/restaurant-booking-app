import { BadRequestException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadsService } from './uploads.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/bucket/presigned?sig=abc'),
}));

function fakeConfig(values: Record<string, string> = {}) {
  return { get: (key: string, def?: string) => values[key] ?? def } as any;
}

describe('UploadsService.createPresignedUpload', () => {
  it('rejects a disallowed content type', async () => {
    const service = new UploadsService(fakeConfig());
    await expect(service.createPresignedUpload('restaurants', 'application/pdf')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('scopes the object key under the requested folder with a random filename', async () => {
    const service = new UploadsService(fakeConfig({ S3_BUCKET: 'test-bucket' }));
    const { key } = await service.createPresignedUpload('menu-items', 'image/png');
    expect(key).toMatch(/^menu-items\/[0-9a-f-]{36}\.png$/);
  });

  it('returns a public URL built from S3_PUBLIC_URL_BASE', async () => {
    const service = new UploadsService(fakeConfig({ S3_PUBLIC_URL_BASE: 'https://cdn.example.com' }));
    const { publicUrl, key } = await service.createPresignedUpload('reviews', 'image/jpeg');
    expect(publicUrl).toBe(`https://cdn.example.com/${key}`);
  });

  it('requests a short-lived presigned URL from S3', async () => {
    const service = new UploadsService(fakeConfig());
    const { uploadUrl } = await service.createPresignedUpload('restaurants', 'image/webp');
    expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 300 });
    expect(uploadUrl).toBe('https://s3.amazonaws.com/bucket/presigned?sig=abc');
  });
});
