import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class SaleItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  variationId?: string;
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

  /** Whether this is a split payment */
  @IsBoolean()
  @IsOptional()
  isSplitPayment?: boolean;

  /** Split payments array - multiple payment methods */
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SplitPaymentDto)
  splitPayments?: SplitPaymentDto[];
}

class SplitPaymentDto {
  @IsString()
  method: 'cash' | 'mpesa' | 'credit';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  amountReceived?: number; // For cash payments

  @IsString()
  @IsOptional()
  mpesaTransactionId?: string; // For M-Pesa payments

  @IsString()
  @IsOptional()
  mpesaReceipt?: string; // For M-Pesa payments

  @IsString()
  @IsOptional()
  creditDueDate?: string; // For credit payments

  @IsString()
  @IsOptional()
  creditNotes?: string; // For credit payments
}
