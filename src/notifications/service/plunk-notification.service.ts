import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NotificationEvent } from '../../common/constants/enums';
import { UserService } from '../../users/service/user.service';
import { NotificationService } from './notification.service';
import {
  buildProductNotificationMessage,
  ProductNotificationPayload,
} from './notification-message.builder';

/**
 * Plunk (useplunk.com) implementation of the notification abstraction.
 * Sends transactional email over Plunk's REST API.
 */
@Injectable()
export class PlunkNotificationService extends NotificationService {
  private readonly logger = new Logger(PlunkNotificationService.name);
  private readonly apiUrl = 'https://api.useplunk.com/v1/send';
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly userService: UserService,
    configService: ConfigService,
  ) {
    super();
    this.apiKey = configService.getOrThrow<string>('EMAIL_PROVIDER_API_KEY');
    this.fromAddress = configService.getOrThrow<string>('EMAIL_FROM_ADDRESS');
  }

  async notify(
    userId: string,
    event: NotificationEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const user = await this.userService.findByIdOrThrow(userId);
    const product = payload as unknown as ProductNotificationPayload;
    const { subject, html } = buildProductNotificationMessage(event, product);

    await firstValueFrom(
      this.httpService.post(
        this.apiUrl,
        {
          to: user.email,
          subject,
          body: html,
          from: this.fromAddress,
          subscribed: true,
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 15_000,
        },
      ),
    );

    this.logger.log(`Plunk email "${event}" sent to ${user.email}`);
  }
}