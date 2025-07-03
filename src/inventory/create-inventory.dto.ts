import { IsString, IsInt, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(0)
  quantity: number;
} 