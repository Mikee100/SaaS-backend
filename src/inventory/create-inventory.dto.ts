import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}
