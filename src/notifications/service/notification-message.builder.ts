import { NotificationEvent } from '../../common/constants/enums';

export interface ProductNotificationPayload {
  productId: string;
  productName?: string;
  model3dUrl?: string;
}

const MODEL_LINK_TMPL = `<p><a href="{url}">View your 3D model</a></p>`;

function modelLink(model3dUrl?: string): string {
  return model3dUrl ? MODEL_LINK_TMPL.replace('{url}', model3dUrl) : '';
}

export interface NotificationMessage {
  subject: string;
  html: string;
}

/**
 * Shared transactional templates for the 3D product lifecycle.
 */
export function buildProductNotificationMessage(
  event: NotificationEvent,
  product: ProductNotificationPayload,
): NotificationMessage {
  switch (event) {
    case NotificationEvent.PRODUCT_3D_READY:
      return {
        subject: `Your 3D model is ready — ${product.productName}`,
        html: `<p>Hi there,</p><p>The 3D model for <strong>${product.productName}</strong> finished generating and your product is now live.</p>${modelLink(product.model3dUrl)}<p>— The Marqet team</p>`,
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
      return {
        subject: 'Marqet update',
        html: '<p>You have a new update on Marqet.</p>',
      };
  }
}
