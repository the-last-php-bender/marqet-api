import { NotificationEvent } from '../../common/constants/enums';

/**
 * Notification abstraction. Business code depends on this class only; the
 * concrete transport is bound in NotificationsModule.
 */
export abstract class NotificationService {
  /**
   * @param userId recipient user id
   * @param event  lifecycle event that happened
   * @param payload template data (productId, productName, model3dUrl, ...)
   */
  abstract notify(
    userId: string,
    event: NotificationEvent,
    payload: Record<string, unknown>,
  ): Promise<void>;
}
