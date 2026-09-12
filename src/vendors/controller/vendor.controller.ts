import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { VendorService } from '../service/vendor.service';
import { Vendor } from '../schemas/vendor.schema';

@ApiTags('vendors')
@ApiBearerAuth('access-token')
@Controller('vendors')
export class VendorController {
	constructor(private readonly vendorService: VendorService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: 'Create your store profile',
		description:
			'Any authenticated user can open a store — no role change, no re-login. One store per account. ' +
			'Required before listing products.',
	})
	@ApiResponse({ status: HttpStatus.CREATED, description: 'Store created.', type: Vendor })
	@ApiResponse({ status: HttpStatus.CONFLICT, description: 'A store already exists for this account.' })
	async create(@CurrentUser('userId') userId: string, @Body() dto: CreateVendorDto) {
		return this.vendorService.createForUser(userId, dto);
	}

	@Get('me')
	@ApiOperation({ summary: 'Get your store profile' })
	@ApiResponse({ status: HttpStatus.OK, description: 'Your store.', type: Vendor })
	@ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No store profile yet.' })
	async me(@CurrentUser('userId') userId: string) {
		return this.vendorService.findByUserIdOrThrow(userId);
	}
}
