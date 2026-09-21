export interface UploadInput {
  /** Object bytes. */
  body: Buffer;
  /** Object key (path) inside the bucket, e.g. products/<id>/FRONT.webp */
  key: string;
  contentType: string;
}

export interface UploadedObject {
  /** Key under which the object was stored — keep it to delete later. */
  key: string;
  /** Public URL for reading the object. */
  url: string;
}

/**
 * Storage abstraction. Business code depends on this class only; concrete
 * R2/S3 adapters live in providers/ and are selected by STORAGE_PROVIDER.
 */
export abstract class StorageProvider {
  abstract upload(input: UploadInput): Promise<UploadedObject>;
  abstract delete(key: string): Promise<void>;
  abstract publicUrl(key: string): string;
}
