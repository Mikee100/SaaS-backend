import { Module } from '@nestjs/common';
import { SectionLogoController } from './section-logo.controller';
import { SectionLogoService } from './section-logo.service';
import { PrismaService } from '../prisma.service';
import { LogoService } from './logo.service';

@Module({
  controllers: [SectionLogoController],
  providers: [SectionLogoService, PrismaService, LogoService],
  exports: [SectionLogoService]
})
<<<<<<< HEAD
export class SectionLogoModule {}
=======
export class SectionLogoModule {}
>>>>>>> a9ab4d8c5762126916fa97fc22de1f53d95703c1
