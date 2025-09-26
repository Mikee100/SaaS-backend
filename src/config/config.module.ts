import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigurationService } from './configuration.service';

@Global()
@Module({
  imports: [NestConfigModule],
  exports: [NestConfigModule, ConfigurationService],
  providers: [ConfigurationService],
})
export class ConfigModule {}
