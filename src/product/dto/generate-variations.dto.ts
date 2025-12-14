import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class VariationAttributeDto {
  @IsString()
  attributeName: string; // e.g., "Color", "Size"

  @IsArray()
  @IsString({ each: true })
  values: string[]; // e.g., ["Black", "Grey"] or ["38", "39", "40"]
}

export class GenerateVariationsDto {
  @IsString()
  productId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationAttributeDto)
  attributes: VariationAttributeDto[]; // Array of attributes with their values

  @IsOptional()
  @IsString()
  skuPrefix?: string; // Optional prefix for generated SKUs

  @IsOptional()
  @IsString()
  branchId?: string;
}
