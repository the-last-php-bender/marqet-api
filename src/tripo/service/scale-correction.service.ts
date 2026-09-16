import { Injectable, Logger } from '@nestjs/common';
import { toCm } from '../../common/utils/unit-conversion.utils';
import { ProductService } from '../../products/service/product.service';
import { GlbMeshInspector, GlbMeshTransformer } from './glb-mesh.service';

/** Ratio difference between height- and width-derived scales beyond which a human must review. */
const SCALE_DELTA_THRESHOLD = 0.2;
const EPSILON = 1e-6;
const SCALED_MODEL_KEY_PREFIX = 'products';

/**
 * Compares the real-world dimensions the seller declared against the generated
 * mesh bounds and rescales the mesh so it matches reality:
 * - consistent scales (within threshold)  → apply average scale → ACTIVE
 * - inconsistent / broken geometry        → NEEDS_REVIEW (human decides)
 */
@Injectable()
export class ScaleCorrectionService {
  private readonly logger = new Logger(ScaleCorrectionService.name);

  constructor(
    private readonly productService: ProductService,
    private readonly meshInspector: GlbMeshInspector,
    private readonly meshTransformer: GlbMeshTransformer,
  ) {}

  async applyScaleCorrection(productId: string): Promise<void> {
    const product = await this.productService.findByIdOrThrow(productId);
    if (!product.model3dUrl)
      throw new Error(`Product ${productId} has no raw 3D model to correct.`);

    const bounds = await this.meshInspector.getBounds(product.model3dUrl);

    const targetHeightCm = toCm(product.heightValue, product.sizeUnit);
    const targetWidthCm = toCm(product.widthValue, product.sizeUnit);

    if (bounds.height <= EPSILON || bounds.width <= EPSILON) {
      this.logger.warn(
        `Product ${productId}: degenerate mesh bounds ${JSON.stringify(bounds)} — flagging for review.`,
      );
      await this.productService.markScaleNeedsReview(productId);
      return;
    }

    const scaleFromHeight = targetHeightCm / bounds.height;
    const scaleFromWidth = targetWidthCm / bounds.width;

    const delta =
      Math.abs(scaleFromHeight - scaleFromWidth) /
      Math.max(Math.max(scaleFromHeight, scaleFromWidth), EPSILON);
    if (!Number.isFinite(delta) || delta > SCALE_DELTA_THRESHOLD) {
      this.logger.warn(
        `Product ${productId}: scale delta ${(delta * 100).toFixed(1)}% exceeds threshold — flagging for review.`,
      );
      await this.productService.markScaleNeedsReview(productId);
      return;
    }

    const finalScale = (scaleFromHeight + scaleFromWidth) / 2;
    const scaledUrl = await this.meshTransformer.applyScale({
      modelUrl: product.model3dUrl,
      scale: finalScale,
      destinationKey: `${SCALED_MODEL_KEY_PREFIX}/${productId}/model.glb`,
    });

    await this.productService.completeWithScaledModel(productId, scaledUrl);
  }
}
