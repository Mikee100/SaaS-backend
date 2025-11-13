import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
