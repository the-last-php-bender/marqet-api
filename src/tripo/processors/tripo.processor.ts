import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  Model3dStatus,
  NotificationEvent,
  ProductStatus,
} from '../../common/constants/enums';
import { ImageRef } from '../../products/schemas/image-ref.schema';
import { ProductService } from '../../products/service/product.service';
import { NotificationService } from '../../notifications/service/notification.service';
import { ScaleCorrectionService } from '../service/scale-correction.service';
import { TripoClientService } from '../service/tripo-client.service';
import { orderByView } from '../tripo-generation.queue';
import { TRIPO_GENERATION_QUEUE } from '../tripo.constants';

interface TripoGenerationJobData {
  productId: string;
  images: ImageRef[];
}

/**
 * Consumes 'tripo-generation' jobs: creates the multiview task, waits for the
 * mesh, scale-corrects it against real-world dimensions and notifies the seller.
 * Transient errors bubble up so BullMQ retries with backoff; after the final
 * attempt the product is marked FAILED and the seller is emailed.
 */
@Processor(TRIPO_GENERATION_QUEUE)
@Injectable()
export class TripoProcessor extends WorkerHost {
  private readonly logger = new Logger(TripoProcessor.name);

  constructor(
    private readonly tripoClient: TripoClientService,
    private readonly productsService: ProductService,
    private readonly scaleCorrectionService: ScaleCorrectionService,
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<TripoGenerationJobData>): Promise<void> {
    const { productId, images } = job.data;
    this.logger.log(
      `Processing 3D generation for product ${productId} (attempt ${job.attemptsMade + 1})`,
    );

    const taskId = await this.tripoClient.createMultiviewTask(
      orderByView(images),
    );
    const modelUrl = await this.tripoClient.waitForModel(taskId);

    await this.productsService.attachRawModel(productId, modelUrl);
    await this.scaleCorrectionService.applyScaleCorrection(productId);

    await this.notifySeller(productId);
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<TripoGenerationJobData>,
    error: Error,
  ): Promise<void> {
    const attemptsAllowed = job.opts.attempts ?? 1;
    if (job.attemptsMade < attemptsAllowed) return; // will retry — keep current state

    this.logger.error(
      `3D generation failed permanently for product ${job.data.productId}: ${error.message}`,
    );
    try {
      await this.productsService.markGenerationFailed(job.data.productId);
      await this.notifySeller(job.data.productId);
    } catch (cleanupError) {
      this.logger.error(
        `Cleanup after failure also failed for ${job.data.productId}`,
        cleanupError as Error,
      );
    }
  }

  private async notifySeller(productId: string): Promise<void> {
    const product = await this.productsService.findByIdOrThrow(productId);
    const event =
      product.status === ProductStatus.NEEDS_REVIEW
        ? NotificationEvent.PRODUCT_NEEDS_REVIEW
        : product.model3dStatus === Model3dStatus.FAILED
          ? NotificationEvent.PRODUCT_3D_FAILED
          : NotificationEvent.PRODUCT_3D_READY;

    try {
      // Email must never fail the pipeline — log-only on error.
      await this.notificationService.notify(product.vendor.toString(), event, {
        productId,
        productName: product.productName,
        model3dUrl: product.model3dUrl,
      });
    } catch (error) {
      this.logger.error(
        `Notification failed for product ${productId}`,
        error as Error,
      );
    }
  }
}
