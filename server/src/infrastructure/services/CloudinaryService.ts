import { Readable } from 'stream';
import cloudinary from '../config/cloudinary';
import { IUploadService, UploadResult } from '../../domain/services/upload.service';

export class CloudinaryService implements IUploadService {
  private upload(buffer: Buffer, folder: string, resourceType: 'image' | 'video' | 'raw'): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      Readable.from(buffer).pipe(stream);
    });
  }

  async uploadImage(buffer: Buffer, folder: string): Promise<string> {
    const result = await this.upload(buffer, `nexthire/${folder}`, 'image');
    return result.url;
  }

  async uploadMedia(buffer: Buffer, folder: string, resourceType: 'image' | 'video' | 'raw'): Promise<UploadResult> {
    return this.upload(buffer, folder, resourceType);
  }
}

export default new CloudinaryService();
