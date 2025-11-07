import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateBackupDto {
  @ApiPropertyOptional({
    description: 'Optional custom name for the backup file'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Optional description for the backup'
  })
  @IsOptional()
  @IsString()
  description?: string;
}
