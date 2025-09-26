import { IsInt, Min, IsOptional, IsString } from 'class-validator';

export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}
