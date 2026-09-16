import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  LengthUnit,
  Model3dStatus,
  ProductStatus,
} from '../../../common/constants/enums';
import { CategoryDocument } from '../../../categories/schemas/category.schema';
import { CreateNafdacProductDto } from '../../dto/create-nafdac-product.dto';
import {
  ProductCreationInput,
  ProductCreationStrategy,
} from '../../interfaces/product-creation-strategy.interface';
import { PRODUCT_KIND } from '../../schemas/product.schema';
import { NafdacLookupService } from '../nafdac-lookup.service';
import { ProductService } from '../product.service';

/**
 * NAFDAC-regulated branch. The registry is the source of truth:
 * - lookup must succeed AND report isValid, otherwise creation is rejected;
 * - productName/expiryDate come from the registry (auto-filled), never trusted
 *   from the client;
 * - nafdacVerified is set only when isValid === true.
 */
@Injectable()
export class NafdacProductCreationStrategy extends ProductCreationStrategy {
  constructor(
    private readonly productService: ProductService,
    private readonly nafdacLookupService: NafdacLookupService,
  ) {
    super();
  }

  supports(category: CategoryDocument): boolean {
    return category.requiresNafdac;
  }

  async create({ vendorId, category, payload }: ProductCreationInput) {
    const dto = this.validatePayload(payload);

    const result = await this.nafdacLookupService.lookup(dto.nafdacNumber);
    if (!result) {
      throw new BadRequestException(
        `NAFDAC number ${dto.nafdacNumber} was not found in the registry.`,
      );
    }
    if (!result.isValid) {
      throw new BadRequestException(
        `NAFDAC number ${dto.nafdacNumber} is registered but not valid.`,
      );
    }

    return this.productService.create({
      kind: PRODUCT_KIND.NAFDAC,
      vendor: vendorId,
      category: category._id.toString(),
      productName: result.productName.trim(),
      description: dto.description.trim(),
      price: dto.price,
      widthValue: dto.widthValue,
      heightValue: dto.heightValue,
      sizeUnit: dto.sizeUnit ?? LengthUnit.CM,
      status: ProductStatus.DRAFT,
      model3dStatus: Model3dStatus.PENDING,
      images: [],
      isDeleted: false,
      nafdacNumber: dto.nafdacNumber.toUpperCase(),
      expiryDate: result.expiryDate,
      nameAutoFilled: !dto.productName,
      nafdacVerified: result.isValid,
    });
  }

  private validatePayload(payload: unknown): CreateNafdacProductDto {
    const dto = plainToInstance(CreateNafdacProductDto, payload);
    const errors = validateSync(dto, { whitelist: true });
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.flatMap((error) => Object.values(error.constraints ?? {})),
      );
    }
    return dto;
  }
}
