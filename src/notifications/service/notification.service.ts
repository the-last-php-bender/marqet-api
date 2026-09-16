import { Injectable } from '@nestjs/common';
import { NotificationEvent } from '../../common/constants/enums';

/**
 * Notification abstraction (Dependency Inversion boundary). Business code
 * depends on this class only. The concrete transport (Plunk email today,
 * push/SMS tomorrow) is bound in NotificationsModule via useClass — adding a
 * channel never touches callers.
 */
export abstract class NotificationService {
  /**
   * @param userId recipient user id (resolved to a destination internally)
   * @param event  which lifecycle event happened
   * @param payload template data (productId, productName, model3dUrl, ...)
   */
  abstract notify(
    userId: string,
    event: NotificationEvent,
    payload: Record<string, unknown>,
  ): Promise<void>;
}
