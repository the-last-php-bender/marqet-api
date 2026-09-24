/** Shared enums for the API. */

/**
 * Single-account model: every registered user can buy AND sell. ADMIN exists
 * for operational endpoints (category management, moderation).
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PENDING_3D = 'PENDING_3D',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
}

export enum Model3dStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export enum LengthUnit {
  CM = 'CM',
  INCH = 'INCH',
  FEET = 'FEET',
}

export enum ProductImageView {
  FRONT = 'FRONT',
  BACK = 'BACK',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationEvent {
  PRODUCT_3D_READY = 'PRODUCT_3D_READY',
  PRODUCT_NEEDS_REVIEW = 'PRODUCT_NEEDS_REVIEW',
  PRODUCT_3D_FAILED = 'PRODUCT_3D_FAILED',
}
