import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/api/client';

type UploadFolder = 'restaurants' | 'menu-items' | 'reviews';

/**
 * Opens the device image picker, uploads the selected photo directly to S3 via a
 * presigned URL (the image bytes never pass through our API), and returns the
 * resulting public URL. Returns null if the user cancels or denies permission.
 */
export async function pickAndUploadImage(folder: UploadFolder): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const contentType = asset.mimeType ?? 'image/jpeg';

  const { data } = await apiClient.post<{ uploadUrl: string; publicUrl: string }>('/uploads/presign', {
    folder,
    contentType,
  });

  const fileResponse = await fetch(asset.uri);
  const blob = await fileResponse.blob();

  const uploadResponse = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!uploadResponse.ok) {
    throw new Error('Image upload failed');
  }

  return data.publicUrl;
}
