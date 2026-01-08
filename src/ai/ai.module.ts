import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma.service';
import { UserModule } from '../user/user.module';
import { TrialGuard } from '../auth/trial.guard';
import { SubscriptionService } from '../billing/subscription.service';
import { BillingService } from '../billing/billing.service';
import { BackupModule } from '../backup/backup.module';
import { OpenAIConfig } from './config/openai.config';
import { ChatService } from './services/chat.service';
import { DataService } from './services/data.service';
import { ExtractionService } from './services/extraction.service';
import { EmbeddingService } from './services/embedding.service';
import { ChartService } from './services/chart.service';
import { ReportService } from './services/report.service';

@Module({
  imports: [UserModule, BackupModule],
  controllers: [AiController],
  providers: [
    AiService,
    PrismaService,
    TrialGuard,
    SubscriptionService,
    BillingService,
    OpenAIConfig,
    ChatService,
    DataService,
    ExtractionService,
    EmbeddingService,
    ChartService,
    ReportService,
  ],
  exports: [AiService],
})
export class AiModule {}
