import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from '../service/auth.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginRequestDto } from '../dto/login-request.dto';
import { RegisterRequestDto } from '../dto/register-request.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Create an account',
    description:
      'Single flow for everyone — a new account can immediately buy AND sell. ' +
      'Returns  JWT plus the created user.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Account created.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already registered.',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (10/min per IP).',
  })
  async register(@Body() dto: RegisterRequestDto) {
    const { user, accessToken } = await this.authService.register(dto);
    return { accessToken, user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Log in',
    description: 'Returns a fresh RS256 JWT for the account.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authenticated.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid email or password.',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded (10/min per IP).',
  })
  async login(@Body() dto: LoginRequestDto) {
    const { user, accessToken } = await this.authService.login(dto);
    return { accessToken, user };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Current authenticated user',
    description:
      'Reads the live DB record, so role/profile changes are always current.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The authenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid token.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User no longer exists.',
  })
  async me(@CurrentUser('userId') userId: string) {
    return this.authService.getProfile(userId);
  }
}
