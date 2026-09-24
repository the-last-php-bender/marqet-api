import { CategoryDocument } from '../../categories/schemas/category.schema';
import { ProductDocument } from '../schemas/product.schema';

/**
 * Strategy contract for product creation. One implementation per regulatory
 * branch; the orchestrator selects via `supports`.
 */
export abstract class ProductCreationStrategy {
  /** Whether this strategy handles the given category. */
  abstract supports(category: CategoryDocument): boolean;

  /** Validates the raw payload against its own DTO and persists the product. */
  abstract create(input: ProductCreationInput): Promise<ProductDocument>;
}

export interface ProductCreationInput {
  vendorId: string;
  category: CategoryDocument;
  payload: unknown;
}
