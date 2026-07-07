export interface UploadResult {
  url: string;
  publicId: string;
}

export interface IUploadService {
  uploadImage(buffer: Buffer, folder: string): Promise<string>;
  uploadMedia(buffer: Buffer, folder: string, resourceType: 'image' | 'video' | 'raw'): Promise<UploadResult>;
}
