import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NotificationEvent } from '../../common/constants/enums';
import { UserService } from '../../users/service/user.service';
import { NotificationService } from './notification.service';

interface ProductPayload {
	productId: string;
	productName?: string;
	model3dUrl?: string;
}

/**
 * Plunk (useplunk.com) implementation of the notification abstraction.
 * Sends transactional email over Plunk's REST API.
 */
@Injectable()
export class PlunkNotificationService extends NotificationService {
	private readonly logger = new Logger(PlunkNotificationService.name);
	private readonly apiKey: string;
	private readonly fromAddress: string;
	private readonly apiUrl = 'https://api.useplunk.com/v1/send';

	constructor(
		private readonly httpService: HttpService,
		private readonly userService: UserService,
		configService: ConfigService,
	) {
		super();
		this.apiKey = configService.getOrThrow<string>('EMAIL_PROVIDER_API_KEY');
		this.fromAddress = configService.getOrThrow<string>('EMAIL_FROM_ADDRESS');
	}

	async notify(userId: string, event: NotificationEvent, payload: Record<string, unknown>): Promise<void> {
		const user = await this.userService.findByIdOrThrow(userId);
		const product = payload as unknown as ProductPayload;
		const { subject, html } = this.buildMessage(event, product);

		await firstValueFrom(
			this.httpService.post(
				this.apiUrl,
				{ to: user.email, subject, body: html, from: this.fromAddress, subscribed: true },
				{ headers: { Authorization: `Bearer ${this.apiKey}` }, timeout: 15_000 },
			),
		);

		this.logger.log(`Plunk email "${event}" sent to ${user.email}`);
	}

	private buildMessage(event: NotificationEvent, product: ProductPayload): { subject: string; html: string } {
		switch (event) {
			case NotificationEvent.PRODUCT_3D_READY:
				return {
					subject: `Your 3D model is ready — ${product.productName}`,
					html: `<p>Hi there,</p><p>The 3D model for <strong>${product.productName}</strong> finished generating and your product is now live.</p>${this.modelLink(product.model3dUrl)}<p>— The Marqet team</p>`,
				};
			case NotificationEvent.PRODUCT_NEEDS_REVIEW:
				return {
					subject: `Action needed: review ${product.productName}`,
					html: `<p>Hi there,</p><p>We generated the 3D model for <strong>${product.productName}</strong>, but its proportions don't match the dimensions you entered. Please review and re-upload clearer images or adjust the dimensions.</p><p>— The Marqet team</p>`,
				};
			case NotificationEvent.PRODUCT_3D_FAILED:
				return {
					subject: `3D generation failed for ${product.productName}`,
					html: `<p>Hi there,</p><p>We couldn't generate a 3D model for <strong>${product.productName}</strong>. Please try again with sharper images taken from all six angles.</p><p>— The Marqet team</p>`,
				};
			default:
				return { subject: 'Marqet update', html: '<p>You have a new update on Marqet.</p>' };
		}
	}

	private modelLink(model3dUrl?: string): string {
		return model3dUrl ? `<p><a href="${model3dUrl}">View your 3D model</a></p>` : '';
	}
}
