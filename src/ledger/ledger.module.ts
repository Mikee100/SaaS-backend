import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { UserModule } from '../user/user.module';
import { RealtimeModule } from '../realtime.module';

@Module({
  imports: [UserModule, RealtimeModule],
  providers: [LedgerService],
  controllers: [LedgerController],
  exports: [LedgerService],
})
export class LedgerModule {}
