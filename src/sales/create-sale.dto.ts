import { IsArray, IsString, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SaleItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  // Add price property
  @IsNumber()
  @IsOptional()
  price?: number;
}

export class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsString()
  paymentMethod: string;

  @IsNumber()
  @IsOptional()
  amountReceived?: number;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsString()
  idempotencyKey: string;

  // Add missing properties
  @IsNumber()
  @IsOptional()
  total?: number;

  @IsNumber()
  @IsOptional()
  vatAmount?: number;

  @IsString()
  @IsOptional()
  mpesaTransactionId?: string;
}