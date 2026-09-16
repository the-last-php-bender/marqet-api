import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyNafdacDto {
  @ApiProperty({
    description:
      'NAFDAC registration number to pre-check before submitting a product.',
    example: 'A1-12345',
  })
  @IsString()
  @Matches(/^[A-Za-z]\d-\d{4,6}$/, {
    message:
      'nafdacNumber must look like A1-12345 (letter, digit, dash, 4–6 digits).',
  })
  nafdacNumber: string;
}
