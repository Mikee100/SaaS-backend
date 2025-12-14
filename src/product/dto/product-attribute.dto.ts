import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttributeValueDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  color?: string; // Hex color for color attributes

  @IsOptional()
  @IsString()
  image?: string; // Image URL

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateProductAttributeDto {
  @IsString()
  name: string; // e.g., "Color", "Size"

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  type?: string; // "text", "number", "color", "image"

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeValueDto)
  values?: CreateAttributeValueDto[];
}

export class UpdateProductAttributeDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddAttributeValueDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
