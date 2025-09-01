import { IsArray, IsString, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SaleItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsString()
  paymentMethod: string;

  @IsNumber()
  amountReceived: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsString()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}