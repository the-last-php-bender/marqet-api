import { CategoryDocument } from '../../categories/schemas/category.schema';
import { ProductDocument } from '../schemas/product.schema';

/**
 * Strategy contract for product creation (Strategy + Open/Closed).
 * One implementation per regulatory branch; adding a new branch (e.g. SONCAP)
 * means adding a strategy — the orchestrator and existing code never change.
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
