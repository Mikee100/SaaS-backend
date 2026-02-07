import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
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
  paymentMethod: string; // 'cash', 'mpesa', 'credit', etc.

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

  @IsString()
  @IsOptional()
  mpesaReceipt?: string; // M-Pesa receipt number

  // Credit-specific fields
  @IsNumber()
  @IsOptional()
  creditAmount?: number; // Amount to be paid on credit

  @IsOptional()
  @IsString()
  creditDueDate?: string; // Due date for credit payment

  @IsOptional()
  @IsString()
  creditNotes?: string; // Notes for credit sale

  /** Optional discount amount (fixed amount in same currency as sale). Applied to subtotal before VAT. */
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;
}
