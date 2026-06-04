import { CrmService } from './crm.service';
import { CRM_ENTITLEMENTS_CONFIG_KEY } from '../auth/crm-entitlements.constants';

type ConfigMeta = {
  description: string;
  category: string;
  isEncrypted: boolean;
  isPublic: boolean;
};

class TenantConfigurationServiceMock {
  private readonly store = new Map<string, string>();

  async getTenantConfiguration(tenantId: string, key: string): Promise<string | null> {
    return this.store.get(`${tenantId}:${key}`) ?? null;
  }

  async setTenantConfiguration(
    tenantId: string,
    key: string,
    value: string,
    _meta: ConfigMeta,
  ): Promise<void> {
    this.store.set(`${tenantId}:${key}`, value);
  }
}

describe('CrmService Wave A smoke', () => {
  const tenantId = 'tenant-wave-a';
  let service: CrmService;
  let configService: TenantConfigurationServiceMock;

  beforeEach(async () => {
    configService = new TenantConfigurationServiceMock();
    service = new CrmService(configService as never);

    await configService.setTenantConfiguration(
      tenantId,
      CRM_ENTITLEMENTS_CONFIG_KEY,
      JSON.stringify({
        packageKey: 'growth',
        enabledCapabilities: ['crm.pipeline', 'crm.tasks', 'crm.reporting'],
        limits: {
          pipelines: 5,
          automationRules: 10,
          documentStorageGb: 20,
          integrationConnections: 8,
          telephonyMinutesMonthly: 0,
          proposalsMonthly: 0,
          contractsMonthly: 0,
        },
        allowedProviders: {
          calendar: ['google'],
          email: ['gmail', 'outlook'],
          telephony: [],
          integrations: ['zapier'],
        },
      }),
      {
        description: 'seed entitlements for tests',
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );
  });

  it('creates pipeline, creates a deal, and moves the deal stage', async () => {
    const createdPipeline = await service.createPipeline(tenantId, {
      name: 'Outbound Pipeline',
      stages: [
        { name: 'Prospect', color: '#2563eb' },
        { name: 'Qualified', color: '#f59e0b' },
      ],
    });

    expect(createdPipeline.name).toBe('Outbound Pipeline');
    expect(createdPipeline.stages).toHaveLength(2);

    const deal = await service.createDeal(tenantId, {
      title: 'Acme Expansion',
      value: 120000,
      currency: 'KES',
      pipelineId: createdPipeline.id,
      stageId: createdPipeline.stages[0].id,
      contactName: 'Jane Doe',
    });

    expect(deal.stageId).toBe(createdPipeline.stages[0].id);

    const moved = await service.moveDealStage(
      tenantId,
      deal.id,
      createdPipeline.stages[1].id,
    );

    expect(moved).not.toBeNull();
    expect(moved?.stageId).toBe(createdPipeline.stages[1].id);

    const board = await service.getPipelineBoard(tenantId);
    expect(board.pipelines).toHaveLength(1);
    expect(board.deals).toHaveLength(1);
    expect(board.deals[0].stageId).toBe(createdPipeline.stages[1].id);
  });

  it('creates and updates CRM tasks', async () => {
    const task = await service.createTask(tenantId, {
      title: 'Send follow-up email',
      priority: 'high',
      assignedTo: 'sales-owner',
    });

    expect(task.status).toBe('todo');
    expect(task.priority).toBe('high');

    const updated = await service.updateTaskStatus(tenantId, task.id, 'done');
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('done');

    const tasks = await service.getTasks(tenantId);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('done');
  });

  it('returns reporting summary with pipeline, deal, and task metrics', async () => {
    const pipeline = await service.createPipeline(tenantId, {
      name: 'SMB Pipeline',
      stages: [{ name: 'Lead', color: '#0ea5e9' }],
    });

    await service.createDeal(tenantId, {
      title: 'Retail POS Upgrade',
      value: 50000,
      currency: 'KES',
      pipelineId: pipeline.id,
      stageId: pipeline.stages[0].id,
    });

    await service.createTask(tenantId, {
      title: 'Book demo',
      priority: 'medium',
    });

    const summary = await service.getReportingSummary(tenantId);

    expect(summary.totals.pipelines).toBe(1);
    expect(summary.totals.deals).toBe(1);
    expect(summary.totals.tasks).toBe(1);
    expect(summary.totals.openDealValue).toBe(50000);
    expect(summary.dealsByStage['Lead']).toBe(1);
    expect(summary.tasksByStatus.todo).toBe(1);
    expect(summary.tasksByStatus.inProgress).toBe(0);
    expect(summary.tasksByStatus.done).toBe(0);
  });
});
