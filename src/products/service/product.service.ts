import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Model3dStatus,
  ProductImageView,
  ProductStatus,
} from '../../common/constants/enums';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { PaginatedResult, paginate } from '../../common/utils/pagination.utils';
import { QueryProductsDto } from '../dto/query-products.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Product, ProductDocument } from '../schemas/product.schema';

export interface ProductSummaryView {
  _id: string;
  productName: string;
  price: number;
  coverImage: string | null;
}

type ProductFilter = Record<string, unknown>;

/**
 * Product persistence and querying. Creation branching and the image upload
 * flow live in ProductCreationService and ProductImageService respectively.
 */
@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  /**
   * Persists a product. The NafdacProduct discriminator is registered on this
   * schema, so passing `kind: NafdacProduct` creates a typed NAFDAC document.
   */
  async create(doc: Record<string, unknown>): Promise<ProductDocument> {
    return this.productModel.create(doc as never);
  }

  async findByIdOrThrow(productId: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({ _id: productId, isDeleted: false })
      .exec();
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  /** Catalogue cards (name, price, cover image) with filters + pagination. */
  async findSummariesFiltered(
    query: QueryProductsDto,
  ): Promise<PaginatedResult<ProductSummaryView>> {
    const page = await this.findFiltered(query);
    return {
      data: page.data.map((product) => this.toSummary(product)),
      pagination: page.pagination,
    };
  }

  private toSummary(product: Product): ProductSummaryView {
    const cover =
      product.images?.find((image) => image.view === ProductImageView.FRONT) ??
      product.images?.[0];
    // lean() documents carry _id at runtime even though the schema class doesn't declare it.
    const id = (product as unknown as { _id: { toString(): string } })._id;
    return {
      _id: id.toString(),
      productName: product.productName,
      price: product.price,
      coverImage: cover?.url ?? null,
    };
  }

  /** Seller dashboard: all (non-deleted) products for a given vendor, any status. */
  async findByVendor(
    vendorId: string,
    params: PaginationQueryDto,
  ): Promise<PaginatedResult<Product>> {
    return paginate({
      model: this.productModel,
      filter: { vendor: new Types.ObjectId(vendorId), isDeleted: false },
      params,
      populate: [
        { path: 'category', select: 'name requiresNafdac' },
        { path: 'vendor', select: 'storeName logoUrl' },
      ],
    });
  }

  findFiltered(query: QueryProductsDto): Promise<PaginatedResult<Product>> {
    return paginate({
      model: this.productModel,
      filter: this.buildListFilter(query),
      params: query,
      populate: [
        { path: 'category', select: 'name requiresNafdac' },
        { path: 'vendor', select: 'storeName logoUrl' },
      ],
    });
  }

  private buildListFilter(query: QueryProductsDto): ProductFilter {
    const filter: ProductFilter = { isDeleted: false };

    // Public listing defaults to ACTIVE; callers may narrow further via ?status=.
    filter.status = query.status ?? ProductStatus.ACTIVE;

    if (query.category) filter.category = new Types.ObjectId(query.category);
    if (query.model3dStatus) filter.model3dStatus = query.model3dStatus;
    if (query.nafdacVerified !== undefined)
      filter.nafdacVerified = query.nafdacVerified;

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {
        ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
      };
    }

    return filter;
  }

  async updateEditableFields(
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductDocument> {
    const product = await this.productModel
      .findOneAndUpdate(
        { _id: productId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  async softDelete(productId: string): Promise<void> {
    const result = await this.productModel
      .updateOne(
        { _id: productId, isDeleted: false },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.matchedCount === 0)
      throw new NotFoundException('Product not found.');
  }

  /** Reverts a product to DRAFT when the 3D queue hand-off fails. */
  async markDraft(productId: string): Promise<void> {
    await this.patchOrThrowNotFound(productId, {
      status: ProductStatus.DRAFT,
      model3dStatus: Model3dStatus.PENDING,
    });
  }

  async attachRawModel(productId: string, modelUrl: string): Promise<void> {
    await this.patchOrThrowNotFound(productId, {
      model3dUrl: modelUrl,
      model3dStatus: Model3dStatus.PROCESSING,
    });
  }

  async markScaleNeedsReview(productId: string): Promise<void> {
    await this.patchOrThrowNotFound(productId, {
      status: ProductStatus.NEEDS_REVIEW,
      model3dStatus: Model3dStatus.COMPLETE,
    });
  }

  async completeWithScaledModel(
    productId: string,
    scaledUrl: string,
  ): Promise<void> {
    await this.patchOrThrowNotFound(productId, {
      model3dUrl: scaledUrl,
      model3dStatus: Model3dStatus.COMPLETE,
      status: ProductStatus.ACTIVE,
    });
  }

  async markGenerationFailed(productId: string): Promise<void> {
    await this.patchOrThrowNotFound(productId, {
      model3dStatus: Model3dStatus.FAILED,
      status: ProductStatus.NEEDS_REVIEW,
    });
  }

  async setImagesAndMarkPending3d(
    productId: string,
    images: Product['images'],
  ): Promise<ProductDocument> {
    const product = await this.productModel
      .findOneAndUpdate(
        { _id: productId, isDeleted: false },
        {
          $set: {
            images,
            status: ProductStatus.PENDING_3D,
            model3dStatus: Model3dStatus.PENDING,
          },
        },
        { new: true },
      )
      .exec();
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  assertOwnership(
    product: ProductDocument,
    vendorId: string,
    isAdmin: boolean,
  ): void {
    if (isAdmin || product.vendor.toString() === vendorId) return;
    // 404 rather than 403 so callers cannot probe for other vendors' product ids.
    throw new NotFoundException('Product not found.');
  }

  countByVendor(vendorId: string): Promise<number> {
    return this.productModel.countDocuments({
      vendor: new Types.ObjectId(vendorId),
      isDeleted: false,
    });
  }

  private async patchOrThrowNotFound(
    productId: string,
    patch: Partial<Product>,
  ): Promise<void> {
    const result = await this.productModel
      .updateOne({ _id: productId, isDeleted: false }, { $set: patch })
      .exec();
    if (result.matchedCount === 0)
      throw new NotFoundException('Product not found.');
  }
}
