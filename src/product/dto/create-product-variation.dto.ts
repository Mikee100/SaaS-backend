import {
  IsArray,
  IsString,
  IsNumber,
  IsObject,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) => Number(value))
  price?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  cost?: number;

  @IsNumber()
  @Transform(({ value }) => Number.parseInt(String(value), 10))
  stock: number;

  @IsObject()
  attributes: Record<string, string>; // e.g., { "Color": "Black", "Size": "38" }

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  alternateBarcodes?: string[];

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  weight?: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}
