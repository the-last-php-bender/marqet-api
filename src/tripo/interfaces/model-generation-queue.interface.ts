import { ImageRef } from '../../products/schemas/image-ref.schema';

/**
 * Boundary between the products module and the Tripo worker infrastructure
 * (Dependency Inversion). Products only know "enqueue generation"; the
 * BullMQ/Upstash specifics live behind this contract in the tripo module.
 */
export abstract class ModelGenerationQueue {
	abstract enqueueGeneration(productId: string, images: ImageRef[]): Promise<void>;
}
