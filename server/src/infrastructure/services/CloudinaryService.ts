import { Readable } from 'stream';
import cloudinary from '../config/cloudinary';
import { IUploadService } from '../../domain/services/upload.service';

export class CloudinaryService implements IUploadService {
  async uploadImage(
    buffer: Buffer,
    folder: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `nexthire/${folder}`,
            resource_type: 'image',
          }, (error, result) => {
            if (error) {
              return reject(error);
            }
            if (!result) {
              return reject(
                new Error('Upload failed')
              );
            }
            resolve(result.secure_url);
          }
        );

      Readable.from(buffer).pipe(uploadStream);
    });
  }
}

export default new CloudinaryService();