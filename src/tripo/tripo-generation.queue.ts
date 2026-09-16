import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ImageRef } from '../products/schemas/image-ref.schema';
import { ModelGenerationQueue } from './interfaces/model-generation-queue.interface';
import { MULTIVIEW_ORDER, TRIPO_GENERATION_QUEUE } from './tripo.constants';
import { ProductImageView } from '../common/constants/enums';

interface TripoGenerationJobData {
  productId: string;
  images: ImageRef[];
}

/**
 * Producer side of the 3D pipeline. Implements the products module's
 * abstraction — products never see BullMQ/Upstash directly.
 */
@Injectable()
export class TripoGenerationQueue implements ModelGenerationQueue {
  constructor(
    @InjectQueue(TRIPO_GENERATION_QUEUE)
    private readonly queue: Queue<TripoGenerationJobData>,
  ) {}

  async enqueueGeneration(
    productId: string,
    images: ImageRef[],
  ): Promise<void> {
    await this.queue.add(
      'generate-3d',
      { productId, images },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }
}

/** Orders the six views into the four-image sequence Tripo multiview expects. */
export function orderByView(images: ImageRef[]): string[] {
  const byView = new Map<ProductImageView, string>(
    images.map((image) => [image.view, image.url]),
  );
  return MULTIVIEW_ORDER.map((view) => {
    const url = byView.get(view as ProductImageView);
    if (!url)
      throw new Error(
        `Cannot enqueue generation: missing "${view}" view image.`,
      );
    return url;
  });
}
