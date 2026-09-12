import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LengthUnit, Model3dStatus, ProductStatus } from '../../../common/constants/enums';
import { CategoryDocument } from '../../../categories/schemas/category.schema';
import { CreateStandardProductDto } from '../../dto/create-standard-product.dto';
import { ProductCreationInput, ProductCreationStrategy } from '../../interfaces/product-creation-strategy.interface';
import { PRODUCT_KIND } from '../../schemas/product.schema';
import { ProductService } from '../product.service';

/**
 * Standard (non-regulated) branch: accepts the client payload as-is after
 * validation. No registry involvement.
 */
@Injectable()
export class StandardProductCreationStrategy extends ProductCreationStrategy {
	constructor(private readonly productService: ProductService) {
		super();
	}

	supports(category: CategoryDocument): boolean {
		return !category.requiresNafdac;
	}

	async create({ vendorId, category, payload }: ProductCreationInput) {
		const dto = this.validatePayload(payload);

		return this.productService.create({
			kind: PRODUCT_KIND.STANDARD,
			vendor: vendorId,
			category: category._id.toString(),
			productName: dto.productName.trim(),
			description: dto.description.trim(),
			price: dto.price,
			widthValue: dto.widthValue,
			heightValue: dto.heightValue,
			sizeUnit: dto.sizeUnit ?? LengthUnit.CM,
			status: ProductStatus.DRAFT,
			model3dStatus: Model3dStatus.PENDING,
			images: [],
			isDeleted: false,
		});
	}

	private validatePayload(payload: unknown): CreateStandardProductDto {
		const dto = plainToInstance(CreateStandardProductDto, payload);
		const errors = validateSync(dto, { whitelist: true });
		if (errors.length > 0) {
			throw new BadRequestException(errors.flatMap((error) => Object.values(error.constraints ?? {})));
		}
		return dto;
	}
}
