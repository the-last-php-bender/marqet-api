import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

/**
 * Data-driven product taxonomy. `requiresNafdac` is the Open/Closed extension
 * point: adding a new regulated category never requires touching product
 * creation logic — the branch reads this flag.
 */
@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, default: false })
  requiresNafdac: boolean;

  @Prop()
  description?: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
