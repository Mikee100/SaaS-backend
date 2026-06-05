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
const domPurifyModule = DOMPurify as unknown as {
  default?: (win: unknown) => { sanitize: (value: string) => string };
};
const createPurify =
  typeof domPurifyModule.default === 'function'
    ? domPurifyModule.default
    : (DOMPurify as unknown as (
        win: unknown,
      ) => { sanitize: (value: string) => string });

const DOMPurifyServer = createPurify(window);

const trimString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

const sanitizeString = (value: unknown): string | undefined => {
  const trimmed = trimString(value);
  return typeof trimmed === 'string'
    ? DOMPurifyServer.sanitize(trimmed)
    : undefined;
};

const sanitizeStringOrOriginal = (value: unknown): unknown =>
  typeof value === 'string' ? DOMPurifyServer.sanitize(value.trim()) : value;

const normalizeEmail = (value: unknown): string | undefined => {
  const trimmed = trimString(value);
  return typeof trimmed === 'string' ? trimmed.toLowerCase() : undefined;
};

const sanitizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => DOMPurifyServer.sanitize(entry.trim()));
};

class OwnerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  name: string;

  @IsEmail()
  @Transform(({ value }: { value: unknown }) => normalizeEmail(value))
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
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  branchName: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  businessType: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeStringOrOriginal(value))
  businessCategory?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeStringOrOriginal(value))
  businessSubcategory?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @Transform(({ value }: { value: unknown }) => sanitizeStringOrOriginal(value))
  businessDescription?: string;

  @IsEmail()
  @Transform(({ value }: { value: unknown }) => normalizeEmail(value))
  contactEmail: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeStringOrOriginal(value))
  contactPhone?: string;

  @IsUrl()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  website?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeStringOrOriginal(value))
  address?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeStringOrOriginal(value))
  city?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeStringOrOriginal(value))
  state?: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  country: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
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
  @Transform(({ value }: { value: unknown }) => sanitizeStringArray(value))
  primaryProducts?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => sanitizeStringArray(value))
  secondaryProducts?: string[];

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  kraPin?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  vatNumber?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  businessLicense?: string;

  @ValidateNested()
  @Type(() => OwnerDto)
  owner: OwnerDto;

  // Security fields
  @IsString()
  @IsNotEmpty()
  recaptchaToken: string;
}
