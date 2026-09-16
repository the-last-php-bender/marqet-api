import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryDocument } from '../../categories/schemas/category.schema';
import { CategoryService } from '../../categories/service/category.service';
import { VendorService } from '../../vendors/service/vendor.service';
import { ProductCreationStrategy } from '../interfaces/product-creation-strategy.interface';
import { NafdacLookupResult } from './nafdac-lookup.service';
import { NafdacLookupService } from './nafdac-lookup.service';
import { NafdacProductCreationStrategy } from './strategies/nafdac-product-creation.strategy';
import { StandardProductCreationStrategy } from './strategies/standard-product-creation.strategy';
import { ProductDocument } from '../schemas/product.schema';

export interface NafdacVerificationView {
  nafdacNumber: string;
  found: boolean;
  isValid?: boolean;
  productName?: string;
  expiryDate?: Date;
  manufacturer?: string;
}

/**
 * Create-time orchestrator (the ONLY place that knows how branching works).
 * The branch is chosen from Category.requiresNafdac — data-driven, so adding
 * a new regulated category requires zero code changes here (Open/Closed).
 */
@Injectable()
export class ProductCreationService {
  private readonly strategies: readonly ProductCreationStrategy[];

  constructor(
    private readonly categoryService: CategoryService,
    private readonly vendorService: VendorService,
    private readonly nafdacLookupService: NafdacLookupService,
    standardStrategy: StandardProductCreationStrategy,
    nafdacStrategy: NafdacProductCreationStrategy,
  ) {
    this.strategies = [nafdacStrategy, standardStrategy];
  }

  async createForUser(
    userId: string,
    payload: unknown,
  ): Promise<ProductDocument> {
    const vendor = await this.vendorService.findByUserIdOrThrow(userId);

    const categoryId = (payload as { categoryId?: string })?.categoryId;
    if (!categoryId) throw new NotFoundException('Category not found.');
    const category = await this.categoryService.findByIdOrThrow(categoryId);

    const strategy = this.strategies.find((candidate) =>
      candidate.supports(category),
    );
    if (!strategy)
      throw new NotFoundException(
        `No creation flow configured for category "${category.name}".`,
      );

    return strategy.create({
      vendorId: vendor._id.toString(),
      category,
      payload,
    });
  }

  /** Pre-check used by POST /products/nafdac/verify before a full submit. */
  async verifyNafdac(nafdacNumber: string): Promise<NafdacVerificationView> {
    const result: NafdacLookupResult | null =
      await this.nafdacLookupService.lookup(nafdacNumber);
    if (!result) {
      return { nafdacNumber: nafdacNumber.toUpperCase(), found: false };
    }
    return {
      nafdacNumber: nafdacNumber.toUpperCase(),
      found: true,
      isValid: result.isValid,
      productName: result.productName,
      expiryDate: result.expiryDate,
      manufacturer: result.manufacturer,
    };
  }
}
