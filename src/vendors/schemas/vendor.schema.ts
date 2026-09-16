import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VendorDocument = HydratedDocument<Vendor>;

/**
 * A seller's store profile. Any authenticated USER can create exactly one —
 * there is no role gate or approval step: one account buys AND sells.
 */
@Schema({ timestamps: true })
export class Vendor {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  storeName: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  logoUrl?: string;

  @Prop({ trim: true })
  address?: string;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

VendorSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const output = ret as unknown as Record<string, unknown>;
    delete output.__v;
    delete output.userId; // internal linkage — callers already know who they are
    return output;
  },
});
