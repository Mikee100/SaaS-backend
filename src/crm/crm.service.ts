import { Injectable } from '@nestjs/common';
import { TenantConfigurationService } from '../config/tenant-configuration.service';
import {
  CRM_ENTITLEMENTS_CONFIG_KEY,
  CRM_USAGE_CONFIG_KEY,
  getDefaultCrmEntitlements,
  normalizeCrmEntitlements,
  normalizeCrmUsage,
} from '../auth/crm-entitlements.constants';

export interface CrmPipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface CrmPipeline {
  id: string;
  name: string;
  stages: CrmPipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface CrmDeal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stageId: string;
  pipelineId: string;
  contactName?: string;
  status: 'open' | 'won' | 'lost';
  createdAt: string;
  updatedAt: string;
}

export interface CrmTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  dealId?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

const CRM_PIPELINES_KEY = 'app.crm.pipelines.v1';
const CRM_DEALS_KEY = 'app.crm.deals.v1';
const CRM_TASKS_KEY = 'app.crm.tasks.v1';

@Injectable()
export class CrmService {
  constructor(
    private readonly tenantConfigurationService: TenantConfigurationService,
  ) {}

  private async readJson<T>(tenantId: string, key: string, fallback: T): Promise<T> {
    const raw = await this.tenantConfigurationService.getTenantConfiguration(tenantId, key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private async writeJson<T>(tenantId: string, key: string, value: T, description: string): Promise<void> {
    await this.tenantConfigurationService.setTenantConfiguration(
      tenantId,
      key,
      JSON.stringify(value),
      {
        description,
        category: 'general',
        isEncrypted: false,
        isPublic: false,
      },
    );
  }

  private buildDefaultStages(): CrmPipelineStage[] {
    return [
      { id: `stage-${Date.now()}-1`, name: 'Lead', order: 1, color: '#0ea5e9' },
      { id: `stage-${Date.now()}-2`, name: 'Qualified', order: 2, color: '#f59e0b' },
      { id: `stage-${Date.now()}-3`, name: 'Proposal', order: 3, color: '#8b5cf6' },
      { id: `stage-${Date.now()}-4`, name: 'Negotiation', order: 4, color: '#6366f1' },
      { id: `stage-${Date.now()}-5`, name: 'Won', order: 5, color: '#10b981' },
    ];
  }

  async getPipelineBoard(tenantId: string) {
    const [pipelines, deals] = await Promise.all([
      this.readJson<CrmPipeline[]>(tenantId, CRM_PIPELINES_KEY, []),
      this.readJson<CrmDeal[]>(tenantId, CRM_DEALS_KEY, []),
    ]);

    if (pipelines.length === 0) {
      const now = new Date().toISOString();
      const defaultPipeline: CrmPipeline = {
        id: `pipeline-${Date.now()}`,
        name: 'Default Sales Pipeline',
        stages: this.buildDefaultStages(),
        createdAt: now,
        updatedAt: now,
      };
      await this.writeJson(tenantId, CRM_PIPELINES_KEY, [defaultPipeline], 'CRM pipelines');
      await this.syncUsage(tenantId, [defaultPipeline]);
      return {
        pipelines: [defaultPipeline],
        deals,
      };
    }

    await this.syncUsage(tenantId, pipelines);
    return {
      pipelines,
      deals,
    };
  }

  async createPipeline(tenantId: string, body: { name: string; stages?: Array<{ name: string; color?: string }> }) {
    const pipelines = await this.readJson<CrmPipeline[]>(tenantId, CRM_PIPELINES_KEY, []);
    const now = new Date().toISOString();
    const pipeline: CrmPipeline = {
      id: `pipeline-${Date.now()}`,
      name: body.name,
      stages: (Array.isArray(body.stages) && body.stages.length > 0
        ? body.stages
        : this.buildDefaultStages().map((s) => ({ name: s.name, color: s.color }))).map((stage, index) => ({
        id: `stage-${Date.now()}-${index + 1}`,
        name: stage.name,
        order: index + 1,
        color: stage.color || '#64748b',
      })),
      createdAt: now,
      updatedAt: now,
    };

    const next = [...pipelines, pipeline];
    await this.writeJson(tenantId, CRM_PIPELINES_KEY, next, 'CRM pipelines');
    await this.syncUsage(tenantId, next);
    return pipeline;
  }

  async createDeal(
    tenantId: string,
    body: { title: string; value?: number; currency?: string; pipelineId: string; stageId: string; contactName?: string },
  ) {
    const deals = await this.readJson<CrmDeal[]>(tenantId, CRM_DEALS_KEY, []);
    const now = new Date().toISOString();
    const deal: CrmDeal = {
      id: `deal-${Date.now()}`,
      title: body.title,
      value: Number(body.value || 0),
      currency: body.currency || 'KES',
      pipelineId: body.pipelineId,
      stageId: body.stageId,
      contactName: body.contactName,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    await this.writeJson(tenantId, CRM_DEALS_KEY, [...deals, deal], 'CRM deals');
    return deal;
  }

  async moveDealStage(tenantId: string, dealId: string, stageId: string) {
    const deals = await this.readJson<CrmDeal[]>(tenantId, CRM_DEALS_KEY, []);
    const now = new Date().toISOString();
    const next = deals.map((deal) =>
      deal.id === dealId ? { ...deal, stageId, updatedAt: now } : deal,
    );
    await this.writeJson(tenantId, CRM_DEALS_KEY, next, 'CRM deals');
    return next.find((deal) => deal.id === dealId) || null;
  }

  async getTasks(tenantId: string) {
    const tasks = await this.readJson<CrmTask[]>(tenantId, CRM_TASKS_KEY, []);
    return tasks;
  }

  async createTask(
    tenantId: string,
    body: { title: string; priority?: 'low' | 'medium' | 'high'; dueDate?: string; dealId?: string; assignedTo?: string },
  ) {
    const tasks = await this.readJson<CrmTask[]>(tenantId, CRM_TASKS_KEY, []);
    const now = new Date().toISOString();
    const task: CrmTask = {
      id: `task-${Date.now()}`,
      title: body.title,
      status: 'todo',
      priority: body.priority || 'medium',
      dueDate: body.dueDate,
      dealId: body.dealId,
      assignedTo: body.assignedTo,
      createdAt: now,
      updatedAt: now,
    };
    await this.writeJson(tenantId, CRM_TASKS_KEY, [...tasks, task], 'CRM tasks');
    return task;
  }

  async updateTaskStatus(tenantId: string, taskId: string, status: CrmTask['status']) {
    const tasks = await this.readJson<CrmTask[]>(tenantId, CRM_TASKS_KEY, []);
    const now = new Date().toISOString();
    const next = tasks.map((task) =>
      task.id === taskId ? { ...task, status, updatedAt: now } : task,
    );
    await this.writeJson(tenantId, CRM_TASKS_KEY, next, 'CRM tasks');
    return next.find((task) => task.id === taskId) || null;
  }

  async getReportingSummary(tenantId: string) {
    const [pipeline, tasks] = await Promise.all([
      this.getPipelineBoard(tenantId),
      this.getTasks(tenantId),
    ]);

    const stages = new Map<string, string>();
    for (const p of pipeline.pipelines) {
      for (const s of p.stages) {
        stages.set(s.id, s.name);
      }
    }

    const dealsByStage: Record<string, number> = {};
    let openValue = 0;
    for (const deal of pipeline.deals) {
      const stageName = stages.get(deal.stageId) || 'Unknown';
      dealsByStage[stageName] = (dealsByStage[stageName] || 0) + 1;
      if (deal.status === 'open') {
        openValue += Number(deal.value || 0);
      }
    }

    const tasksByStatus = {
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
    };

    const entitlementsRaw = await this.tenantConfigurationService.getTenantConfiguration(
      tenantId,
      CRM_ENTITLEMENTS_CONFIG_KEY,
    );
    let parsedEntitlements: unknown;
    try {
      parsedEntitlements = entitlementsRaw ? JSON.parse(entitlementsRaw) : undefined;
    } catch {
      parsedEntitlements = undefined;
    }
    const entitlements = normalizeCrmEntitlements(parsedEntitlements || getDefaultCrmEntitlements());

    const usageRaw = await this.tenantConfigurationService.getTenantConfiguration(
      tenantId,
      CRM_USAGE_CONFIG_KEY,
    );
    let parsedUsage: unknown;
    try {
      parsedUsage = usageRaw ? JSON.parse(usageRaw) : undefined;
    } catch {
      parsedUsage = undefined;
    }
    const usage = normalizeCrmUsage(parsedUsage);

    return {
      totals: {
        pipelines: pipeline.pipelines.length,
        deals: pipeline.deals.length,
        openDealValue: openValue,
        tasks: tasks.length,
      },
      dealsByStage,
      tasksByStatus,
      limits: entitlements.limits,
      usage,
    };
  }

  private async syncUsage(tenantId: string, pipelines: CrmPipeline[]) {
    const usageRaw = await this.tenantConfigurationService.getTenantConfiguration(
      tenantId,
      CRM_USAGE_CONFIG_KEY,
    );

    let parsedUsage: unknown;
    try {
      parsedUsage = usageRaw ? JSON.parse(usageRaw) : undefined;
    } catch {
      parsedUsage = undefined;
    }

    const usage = normalizeCrmUsage(parsedUsage);
    const next = {
      ...usage,
      pipelines: pipelines.length,
    };

    await this.writeJson(tenantId, CRM_USAGE_CONFIG_KEY, next, 'CRM usage counters');
  }
}
