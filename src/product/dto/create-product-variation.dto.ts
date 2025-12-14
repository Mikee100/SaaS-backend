import { IsString, IsNumber, IsObject, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AttributeValueDto {
  @IsString()
  attributeName: string;

  @IsString()
  value: string;
}

export class CreateProductVariationDto {
  @IsString()
  productId: string;

  @IsString()
  sku: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  price?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  cost?: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  stock: number;

  @IsObject()
  attributes: Record<string, string>; // e.g., { "Color": "Black", "Size": "38" }

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  weight?: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}
