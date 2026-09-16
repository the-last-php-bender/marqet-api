import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({
    description: 'Public name of your store.',
    example: "Ada's Beauty Store",
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeName: string;

  @ApiPropertyOptional({
    description: 'What your store sells.',
    example: 'Authentic skincare and cosmetics.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Store logo image URL.',
    example: 'https://pub-xxxx.r2.dev/logos/ada.png',
  })
  @IsOptional()
  @IsUrl({}, { message: 'logoUrl must be a valid URL.' })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Physical address of the store.',
    example: '12 Market Road, Enugu',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}
