import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/constants/enums';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/guards/roles.guard';
import { CategoryService } from '../service/category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { Category } from '../schemas/category.schema';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
	constructor(private readonly categoryService: CategoryService) {}

	@Public()
	@Get()
	@ApiOperation({
		summary: 'List all categories',
		description: 'Public. Each category includes `requiresNafdac` so the frontend knows which upload flow to render.',
	})
	@ApiResponse({ status: HttpStatus.OK, description: 'All categories sorted by name.', type: [Category] })
	async findAll() {
		return this.categoryService.findAll();
	}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiBearerAuth('access-token')
	@Roles(UserRole.ADMIN)
	@ApiOperation({ summary: 'Create a category (admin only)' })
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Category created.', type: Category })
	@ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed.' })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'Category name already exists.' })
	@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Requires ADMIN role.' })
	async create(@Body() dto: CreateCategoryDto) {
		return this.categoryService.create(dto.name, dto.requiresNafdac, dto.description);
	}
}
