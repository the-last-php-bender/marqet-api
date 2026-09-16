import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ModelGenerationQueue } from './interfaces/model-generation-queue.interface';
import { TRIPO_GENERATION_QUEUE } from './tripo.constants';
import { TripoGenerationQueue } from './tripo-generation.queue';

/**
 * Registers the 'tripo-generation' queue and exposes it behind the
 * ModelGenerationQueue abstraction. The BullMQ/Upstash ROOT connection is
 * configured once in AppModule; Upstash requires TLS (`rediss://`) and
 * BullMQ requires maxRetriesPerRequest: null — both set there.
 */
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: TRIPO_GENERATION_QUEUE })],
  providers: [
    TripoGenerationQueue,
    // Alias so consumers can inject the abstraction (ModelGenerationQueue)
    // while the BullMQ queue is instantiated exactly once.
    { provide: ModelGenerationQueue, useExisting: TripoGenerationQueue },
  ],
  exports: [BullModule, TripoGenerationQueue, ModelGenerationQueue],
})
export class TripoQueueModule {}
