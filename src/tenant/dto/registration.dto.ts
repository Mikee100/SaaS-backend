import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsUrl,
  IsIn,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create a DOMPurify instance for server-side usage
const window = new JSDOM('').window;
const DOMPurifyServer = DOMPurify(window as any);

class OwnerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => DOMPurifyServer.sanitize(value?.trim()))
  name: string;

  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}

export class RegistrationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => DOMPurifyServer.sanitize(value?.trim()))
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => DOMPurifyServer.sanitize(value?.trim()))
  branchName: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => DOMPurifyServer.sanitize(value?.trim()))
  businessType: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    value ? DOMPurifyServer.sanitize(value.trim()) : value,
  )
  businessCategory?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    value ? DOMPurifyServer.sanitize(value.trim()) : value,
  )
  businessSubcategory?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @Transform(({ value }) =>
    value ? DOMPurifyServer.sanitize(value.trim()) : value,
  )
  businessDescription?: string;

  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  contactEmail: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    value ? DOMPurifyServer.sanitize(value.trim()) : value,
  )
  contactPhone?: string;

  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : value))
  website?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    value ? DOMPurifyServer.sanitize(value.trim()) : value,
  )
  address?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    value ? DOMPurifyServer.sanitize(value.trim()) : value,
  )
  city?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    value ? DOMPurifyServer.sanitize(value.trim()) : value,
  )
  state?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  country: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : value))
  postalCode?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  foundedYear?: number;

  @IsString()
  @IsOptional()
  @IsIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
  employeeCount?: string;

  @IsString()
  @IsOptional()
  @IsIn([
    '< 1M KES',
    '1M-10M KES',
    '10M-50M KES',
    '50M-100M KES',
    '100M-500M KES',
    '500M+ KES',
  ])
  annualRevenue?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? value.map((v: string) => DOMPurifyServer.sanitize(v.trim()))
      : value,
  )
  primaryProducts?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? value.map((v: string) => DOMPurifyServer.sanitize(v.trim()))
      : value,
  )
  secondaryProducts?: string[];

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : value))
  kraPin?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : value))
  vatNumber?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : value))
  businessLicense?: string;

  @ValidateNested()
  @Type(() => OwnerDto)
  owner: OwnerDto;

  // Security fields
  @IsString()
  @IsNotEmpty()
  recaptchaToken: string;
}
