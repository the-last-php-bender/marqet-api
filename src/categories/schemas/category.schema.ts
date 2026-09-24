import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

/**
 * Product taxonomy. `requiresNafdac` selects which creation flow applies to a
 * category, so product creation logic does not need per-category branching.
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
