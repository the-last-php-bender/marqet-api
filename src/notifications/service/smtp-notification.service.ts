import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { NotificationEvent } from '../../common/constants/enums';
import { UserService } from '../../users/service/user.service';
import { NotificationService } from './notification.service';
import {
  buildProductNotificationMessage,
  ProductNotificationPayload,
} from './notification-message.builder';

/**
 * SMTP implementation of the notification abstraction, using nodemailer
 * against the relay configured via env.
 */
@Injectable()
export class SmtpNotificationService extends NotificationService {
  private readonly logger = new Logger(SmtpNotificationService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;
  private readonly userService: UserService;

  constructor(userService: UserService, configService: ConfigService) {
    super();
    this.userService = userService;
    const secure =
      (configService.get<string>('SMTP_SECURE') ?? 'false').toLowerCase() ===
      'true';
    const port = Number(configService.get<string>('SMTP_PORT') ?? '587');
    this.transporter = nodemailer.createTransport({
      host: configService.getOrThrow<string>('SMTP_HOST'),
      port,
      secure,
      auth: {
        user: configService.getOrThrow<string>('SMTP_USER'),
        pass: configService.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });
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

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: user.email,
      subject,
      html,
    });

    this.logger.log(`SMTP email "${event}" sent to ${user.email}`);
  }
}
