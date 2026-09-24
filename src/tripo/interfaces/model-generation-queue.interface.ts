import { ImageRef } from '../../products/schemas/image-ref.schema';

/**
 * Boundary between the products module and the 3D generation infrastructure.
 * Products only know "enqueue generation"; the queue specifics stay in the
 * tripo module.
 */
export abstract class ModelGenerationQueue {
  abstract enqueueGeneration(
    productId: string,
    images: ImageRef[],
  ): Promise<void>;
}
