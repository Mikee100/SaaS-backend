import { IsString, IsInt, Min, IsOptional, Max, IsIn } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsString()
  location?: string;
}
