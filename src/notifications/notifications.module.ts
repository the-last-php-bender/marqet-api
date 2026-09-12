import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from '../users/users.module';
import { NotificationService } from './service/notification.service';
import { PlunkNotificationService } from './service/plunk-notification.service';

@Module({
	imports: [HttpModule, UsersModule],
	providers: [{ provide: NotificationService, useClass: PlunkNotificationService }],
	exports: [NotificationService],
})
export class NotificationsModule {}
