import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductsModule } from '../products/products.module';
import { StorageModule } from '../storage/storage.module';
import { TripoProcessor } from './processors/tripo.processor';
import { GlbMeshInspector, GlbMeshTransformer } from './service/glb-mesh.service';
import { ScaleCorrectionService } from './service/scale-correction.service';
import { TripoClientService } from './service/tripo-client.service';
import { TripoQueueModule } from './tripo-queue.module';

/**
 * Consumer side of the 3D pipeline: the BullMQ worker, the Tripo HTTP adapter,
 * GLB mesh inspection/transformation and scale correction orchestration.
 */
@Module({
	imports: [TripoQueueModule, ProductsModule, NotificationsModule, StorageModule, HttpModule],
	providers: [
		TripoProcessor,
		TripoClientService,
		GlbMeshInspector,
		GlbMeshTransformer,
		ScaleCorrectionService,
	],
	exports: [GlbMeshInspector, GlbMeshTransformer, ScaleCorrectionService],
})
export class TripoModule {}
