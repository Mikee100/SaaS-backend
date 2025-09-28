import { IsInt, Min, IsOptional, IsString } from 'class-validator';

export class UpdateInventoryDto {
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
