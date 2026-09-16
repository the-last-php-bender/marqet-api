import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProductImageView, UserRole } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { Roles } from '../../common/guards/roles.guard';
import { VendorService } from '../../vendors/service/vendor.service';
import { CreateNafdacProductDto } from '../dto/create-nafdac-product.dto';
import { CreateStandardProductDto } from '../dto/create-standard-product.dto';
import { QueryProductsDto } from '../dto/query-products.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { VerifyNafdacDto } from '../dto/verify-nafdac.dto';
import { ProductImageService } from '../service/product-image.service';
import { ProductService } from '../service/product.service';
import { ProductCreationService } from '../service/product-creation.service';
import { Product } from '../schemas/product.schema';

const IMAGE_VIEW_FIELDS = Object.values(ProductImageView).map((view) => ({
  name: view,
  maxCount: 1,
}));

@ApiExtraModels(CreateStandardProductDto, CreateNafdacProductDto)
@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly productCreationService: ProductCreationService,
    private readonly productImageService: ProductImageService,
    private readonly vendorService: VendorService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.USER)
  @ApiOperation({
    summary: 'Create a product (draft)',
    description:
      'Accepts ONE of two payload shapes, chosen automatically by the category: regulated categories ' +
      '(`requiresNafdac: true`) validate the NAFDAC number against the registry and auto-fill regulatory fields; ' +
      'standard categories take the plain shape. Requires a store profile (POST /vendors). ' +
      'The product starts as DRAFT — attach its 6 images next.',
  })
  @ApiBody({
    description:
      'Standard OR NAFDAC payload depending on the category of `categoryId`.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(CreateStandardProductDto) },
        { $ref: getSchemaPath(CreateNafdacProductDto) },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product draft created.',
    type: Product,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or NAFDAC lookup rejected the number.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid token.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found, or caller has no store profile yet.',
  })
  async create(
    @CurrentUser() user: { userId: string },
    @Body() payload: unknown,
  ) {
    return this.productCreationService.createForUser(user.userId, payload);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List products',
    description:
      'Public catalogue with filters + pagination. Defaults to ACTIVE products only. ' +
      'Returns slim cards: `_id`, `productName`, `price`, `coverImage` (the FRONT view when available). ' +
      'Use GET /products/:id for full details.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated product cards.',
  })
  async list(@Query() query: QueryProductsDto) {
    return this.productService.findSummariesFiltered(query);
  }

  @Public()
  @Post('nafdac/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verify a NAFDAC number (public)',
    description:
      'PUBLIC — no authentication required. Queries the OFFICIAL NAFDAC Greenbook registry ' +
      '(greenbook.nafdac.gov.ng) and returns the registered product name, manufacturer, expiry date and validity. ' +
      'Anyone can use Marqet to verify a product before buying. Rate limited to 10 requests/minute per IP ' +
      'to protect the upstream registry.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Verification result.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Malformed or unknown NAFDAC number.',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded.',
  })
  async verifyNafdac(@Body() dto: VerifyNafdacDto) {
    return this.productCreationService.verifyNafdac(dto.nafdacNumber);
  }

  @Get('mine')
  @ApiBearerAuth('access-token')
  @Roles(UserRole.USER)
  @ApiOperation({
    summary: 'List my products (seller dashboard)',
    description:
      'Returns all non-deleted products owned by the authenticated seller, ' +
      'regardless of status (DRAFT, PENDING_3D, ACTIVE, etc.). ' +
      'Includes category name, vendor info, and model3dStatus for each product.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated product list.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid token.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Caller has no store profile.' })
  async listMine(
    @CurrentUser() user: { userId: string },
    @Query() query: PaginationQueryDto,
  ) {
    const vendor = await this.vendorService.findByUserIdOrThrow(user.userId);
    return this.productService.findByVendor(vendor._id.toString(), query);
  }

  @Post(':id/images')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileFieldsInterceptor(IMAGE_VIEW_FIELDS))
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOperation({
    summary: 'Attach the 6 view images (owner only)',
    description:
      'Multipart upload with EXACTLY six single-file fields named FRONT, BACK, LEFT, RIGHT, TOP, BOTTOM. ' +
      'JPEG/PNG/WebP up to 5MB each. Uploads run in parallel; on success the product flips to PENDING_3D ' +
      'and the Tripo 3D job is queued. Poll GET /products/:id/3d-status afterwards.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: Object.fromEntries(
        IMAGE_VIEW_FIELDS.map(({ name }) => [
          name,
          {
            type: 'string',
            format: 'binary',
            description: `${name} view image`,
          },
        ]),
      ),
      required: IMAGE_VIEW_FIELDS.map(({ name }) => name),
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Images accepted; 3D generation queued.',
    type: Product,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Missing/duplicate views, unsupported type or size > 5MB.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found or not owned by you.',
  })
  async attachImages(
    @CurrentUser() user: { userId: string; roles: UserRole[] },
    @Param('id') productId: string,
    @UploadedFiles()
    files: Partial<Record<ProductImageView, Express.Multer.File[]>>,
  ) {
    return this.productImageService.attachImages(
      user.userId,
      user.roles,
      productId,
      files ?? {},
    );
  }

  @Public()
  @Get(':id/3d-status')
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOperation({
    summary: 'Poll 3D model generation status',
    description:
      'Returns `model3dStatus` (PENDING → PROCESSING → COMPLETE | FAILED) and the model URL once COMPLETE.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current 3D generation state.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found.',
  })
  async get3dStatus(@Param('id') productId: string) {
    const product = await this.productService.findByIdOrThrow(productId);
    return {
      productId: product._id,
      model3dStatus: product.model3dStatus,
      model3dUrl: product.model3dUrl ?? null,
      status: product.status,
    };
  }

  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOperation({ summary: 'Get a single product' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The product.',
    type: Product,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found.',
  })
  async getById(@Param('id') productId: string) {
    return this.productService.findByIdOrThrow(productId);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOperation({
    summary: 'Update editable fields (owner only)',
    description:
      'Only description, price and real-world dimensions are editable. Regulatory fields on NAFDAC products ' +
      '(nafdacNumber, expiryDate) are absent from this DTO and can therefore never be patched.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated product.',
    type: Product,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found or not owned by you.',
  })
  async update(
    @CurrentUser() user: { userId: string; roles: UserRole[] },
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    await this.assertOwnership(user, productId);
    return this.productService.updateEditableFields(productId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOperation({
    summary: 'Soft-delete a product (owner or admin)',
    description:
      'Marks the product deleted — it disappears from listings while history is retained.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Product deleted.' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found or not owned by you.',
  })
  async remove(
    @CurrentUser() user: { userId: string; roles: UserRole[] },
    @Param('id') productId: string,
  ) {
    await this.assertOwnership(user, productId);
    await this.productService.softDelete(productId);
    return { message: 'Product deleted.' };
  }

  private async assertOwnership(
    user: { userId: string; roles: UserRole[] },
    productId: string,
  ): Promise<void> {
    const vendor = await this.vendorService.findByUserIdOrThrow(user.userId);
    const product = await this.productService.findByIdOrThrow(productId);
    this.productService.assertOwnership(
      product,
      vendor._id.toString(),
      user.roles.includes(UserRole.ADMIN),
    );
  }
}
