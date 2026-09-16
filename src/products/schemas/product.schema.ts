import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  LengthUnit,
  Model3dStatus,
  ProductStatus,
} from '../../common/constants/enums';
import { ImageRef, ImageRefSchema, validateSixViews } from './image-ref.schema';

export type ProductDocument = HydratedDocument<Product>;

/** Discriminator key values used inside the products collection. */
export const PRODUCT_KIND = {
  STANDARD: 'Product',
  NAFDAC: 'NafdacProduct',
} as const;

/**
 * Base product. NAFDAC-regulated items use the NafdacProduct discriminator
 * (same collection, `kind` field) so queries/filtering stay in one index space.
 */
@Schema({ timestamps: true, discriminatorKey: 'kind' })
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true })
  vendor: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  // Real-world dimensions — used to scale-correct the generated 3D mesh.
  @Prop({ required: true, min: 0 })
  widthValue: number;

  @Prop({ required: true, min: 0 })
  heightValue: number;

  @Prop({ required: true, enum: LengthUnit, default: LengthUnit.CM })
  sizeUnit: LengthUnit;

  @Prop({ enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Prop({
    type: [ImageRefSchema],
    validate: [
      validateSixViews,
      'Exactly 6 images, one per view, are required.',
    ],
  })
  images: ImageRef[];

  @Prop()
  model3dUrl?: string;

  @Prop({ enum: Model3dStatus, default: Model3dStatus.PENDING })
  model3dStatus: Model3dStatus;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes backing the primary listing/filter paths (see QueryProductsDto).
ProductSchema.index({ status: 1, category: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ vendor: 1, status: 1 });
ProductSchema.index({ createdAt: -1 });

// Keep API payloads clean: no version key, no soft-delete bookkeeping.
// (Discriminator schemas inherit this transform.)
ProductSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const output = ret as unknown as Record<string, unknown>;
    delete output.__v;
    delete output.isDeleted;
    return output;
  },
});
