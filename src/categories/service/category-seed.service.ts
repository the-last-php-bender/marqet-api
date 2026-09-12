import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CategoryService } from './category.service';

/** Demo-ready taxonomy seeded once on boot (idempotent). */
const DEFAULT_CATEGORIES = [
	{ name: 'Drugs', requiresNafdac: true, description: 'Medicines, supplements and related health products.' },
	{ name: 'Food & Beverages', requiresNafdac: true, description: 'Packaged food and drinks regulated by NAFDAC.' },
	{ name: 'Cosmetics', requiresNafdac: true, description: 'Skincare, haircare and beauty products.' },
	{ name: 'Electronics', requiresNafdac: false, description: 'Consumer electronics and accessories.' },
	{ name: 'Fashion', requiresNafdac: false, description: 'Clothing, shoes and fashion accessories.' },
	{ name: 'Home & Kitchen', requiresNafdac: false, description: 'Home appliances and kitchenware.' },
];

@Injectable()
export class CategorySeedService implements OnApplicationBootstrap {
	private readonly logger = new Logger(CategorySeedService.name);

	constructor(private readonly categoryService: CategoryService) {}

	async onApplicationBootstrap(): Promise<void> {
		await this.categoryService.insertManyIfEmpty(DEFAULT_CATEGORIES);
		this.logger.log(`Category seed ensured (${DEFAULT_CATEGORIES.length} defaults available).`);
	}
}
