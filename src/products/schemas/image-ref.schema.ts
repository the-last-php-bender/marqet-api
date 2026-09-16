import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ProductImageView } from '../../common/constants/enums';

/**
 * Embedded image reference. `_id: false` keeps documents lean;
 * `key` is retained so the object can be deleted from storage later.
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

/** All six views must be present, each exactly once. */
export function validateSixViews(images: ImageRef[]): boolean {
  if (
    !Array.isArray(images) ||
    images.length !== Object.values(ProductImageView).length
  )
    return false;
  const uniqueViews = new Set(images.map((image) => image.view));
  return uniqueViews.size === images.length;
}
