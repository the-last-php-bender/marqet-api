import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UserRole } from '../../common/constants/enums';
import { getExtensionFromMimeType } from '../../common/utils/file.utils';
import { StorageProvider } from '../../storage/interfaces/storage-provider.interface';
import { ModelGenerationQueue } from '../../tripo/interfaces/model-generation-queue.interface';
import { VendorService } from '../../vendors/service/vendor.service';
import { ProductImageView } from '../../common/constants/enums';
import { ImageRef } from '../schemas/image-ref.schema';
import { ProductDocument } from '../schemas/product.schema';
import { ProductService } from './product.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALL_VIEWS = Object.values(ProductImageView);

type ViewFiles = Partial<
  Record<ProductImageView, Express.Multer.File[] | undefined>
>;

/**
 * 6-view image upload flow: validation, parallel storage upload,
 * PENDING_3D transition, and hand-off to the 3D generation queue.
 */
@Injectable()
export class ProductImageService {
  private readonly logger = new Logger(ProductImageService.name);

  constructor(
    private readonly productService: ProductService,
    private readonly vendorService: VendorService,
    private readonly storageProvider: StorageProvider,
    private readonly modelGenerationQueue: ModelGenerationQueue,
  ) {}

  async attachImages(
    userId: string,
    roles: UserRole[],
    productId: string,
    files: ViewFiles,
  ): Promise<ProductDocument> {
    const vendor = await this.vendorService.findByUserIdOrThrow(userId);
    const product = await this.productService.findByIdOrThrow(productId);
    this.productService.assertOwnership(
      product,
      vendor._id.toString(),
      roles.includes(UserRole.ADMIN),
    );

    const validated = this.extractExactlyOnePerView(files);

    // Best-effort cleanup of previously attached objects (parallel).
    await Promise.allSettled(
      product.images.map((image) => this.storageProvider.delete(image.key)),
    );

    const uploaded = await Promise.all(
      validated.map(({ view, file }) => this.uploadView(productId, view, file)),
    );

    const updated = await this.productService.setImagesAndMarkPending3d(
      productId,
      uploaded,
    );

    try {
      await this.modelGenerationQueue.enqueueGeneration(productId, uploaded);
    } catch (error) {
      // Redis unavailable: do not leave the product stuck in PENDING_3D.
      this.logger.error(
        `Failed to enqueue 3D generation for product ${productId}`,
        error as Error,
      );
      await this.productService.markDraft(productId);
      throw new BadRequestException(
        'Could not schedule 3D generation right now. Please retry shortly.',
      );
    }

    return updated;
  }

  private async uploadView(
    productId: string,
    view: ProductImageView,
    file: Express.Multer.File,
  ): Promise<ImageRef> {
    const extension = getExtensionFromMimeType(file.mimetype) ?? '';
    const key = `products/${productId}/${view}${extension}`;
    const { url } = await this.storageProvider.upload({
      body: file.buffer,
      key,
      contentType: file.mimetype,
    });
    return { view, url, key };
  }

  private extractExactlyOnePerView(
    files: ViewFiles,
  ): Array<{ view: ProductImageView; file: Express.Multer.File }> {
    const extracted: Array<{
      view: ProductImageView;
      file: Express.Multer.File;
    }> = [];

    for (const view of ALL_VIEWS) {
      const candidates = files[view];
      if (!candidates || candidates.length === 0) {
        throw new BadRequestException(
          `Missing image for view "${view}". All 6 views are required.`,
        );
      }
      if (candidates.length > 1) {
        throw new BadRequestException(
          `More than one image supplied for view "${view}".`,
        );
      }
      const file = candidates[0];
      this.assertValidImage(view, file);
      extracted.push({ view, file });
    }

    return extracted;
  }

  private assertValidImage(
    view: ProductImageView,
    file: Express.Multer.File,
  ): void {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `Image for view "${view}" exceeds the 5MB limit.`,
      );
    }
    if (!getExtensionFromMimeType(file.mimetype)) {
      throw new BadRequestException(
        `Image for view "${view}" must be a JPEG, PNG or WebP file.`,
      );
    }
  }
}
