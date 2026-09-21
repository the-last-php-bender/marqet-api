import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ProductImageView } from '../../common/constants/enums';

/**
 * Embedded image reference. `_id: false` keeps documents lean; `key` is kept
 * so the object can be deleted from storage later.
 */
@Schema({ _id: false })
export class ImageRef {
  @Prop({ required: true, enum: ProductImageView })
  view: ProductImageView;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  key: string;
}

export const ImageRefSchema = SchemaFactory.createForClass(ImageRef);

/** Drafts start with no images; once attached, all six views must be present exactly once. */
export function validateSixViews(images: ImageRef[]): boolean {
  if (images.length === 0) return true;
  if (images.length !== Object.values(ProductImageView).length) return false;
  const uniqueViews = new Set(images.map((image) => image.view));
  return uniqueViews.size === images.length;
}
