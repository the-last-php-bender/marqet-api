import { Module } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { UserService } from '../users/service/user.service';
import { NotificationService } from './service/notification.service';
import { PlunkNotificationService } from './service/plunk-notification.service';
import { SmtpNotificationService } from './service/smtp-notification.service';

@Module({
  imports: [HttpModule, UsersModule],
  providers: [
    {
      provide: NotificationService,
      useFactory: (
        configService: ConfigService,
        httpService: HttpService,
        userService: UserService,
      ): NotificationService =>
        configService.get('EMAIL_PROVIDER') === 'plunk'
          ? new PlunkNotificationService(httpService, userService, configService)
          : new SmtpNotificationService(userService, configService),
      inject: [ConfigService, HttpService, UserService],
    },
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}