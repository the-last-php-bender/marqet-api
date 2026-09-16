import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Product } from './product.schema';

/**
 * Discriminator for NAFDAC-regulated products. Regulatory fields are filled
 * from the authoritative lookup at creation time and are NEVER client-editable.
 */
@Schema()
export class NafdacProduct extends Product {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  nafdacNumber: string;

  @Prop({ required: true })
  expiryDate: Date;

  @Prop({ default: true })
  nameAutoFilled: boolean;

  @Prop({ required: true, default: false })
  nafdacVerified: boolean;
}

export const NafdacProductSchema = SchemaFactory.createForClass(NafdacProduct);
