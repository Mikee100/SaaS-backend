import { Module } from '@nestjs/common';
import { SectionLogoController } from './section-logo.controller';
import { SectionLogoService } from './section-logo.service';
import { PrismaService } from '../prisma.service';
import { LogoService } from './logo.service';

@Module({
  controllers: [SectionLogoController],
  providers: [SectionLogoService, PrismaService, LogoService],
  exports: [SectionLogoService],
})
export class SectionLogoModule {}
