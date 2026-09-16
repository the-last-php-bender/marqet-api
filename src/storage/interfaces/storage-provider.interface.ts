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
 * Storage abstraction (Dependency Inversion boundary).
 * Business code depends on THIS class only; concrete R2/S3 adapters live in
 * providers/ and are swapped by STORAGE_PROVIDER in storage.module.ts.
 */
export abstract class StorageProvider {
  abstract upload(input: UploadInput): Promise<UploadedObject>;
  abstract delete(key: string): Promise<void>;
  abstract publicUrl(key: string): string;
}
