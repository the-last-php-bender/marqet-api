import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ModelGenerationQueue } from './interfaces/model-generation-queue.interface';
import { TRIPO_GENERATION_QUEUE } from './tripo.constants';
import { TripoGenerationQueue } from './tripo-generation.queue';

/**
 * Registers the 'tripo-generation' queue and exposes it behind the
 * ModelGenerationQueue abstraction. The BullMQ connection itself is configured
 * once in AppModule.
 */
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: TRIPO_GENERATION_QUEUE })],
  providers: [
    TripoGenerationQueue,
    // Expose the abstraction while keeping a single queue instance.
    { provide: ModelGenerationQueue, useExisting: TripoGenerationQueue },
  ],
  exports: [BullModule, TripoGenerationQueue, ModelGenerationQueue],
})
export class TripoQueueModule {}
