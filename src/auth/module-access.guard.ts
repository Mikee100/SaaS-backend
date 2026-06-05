import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';
import {
  AppModuleKey,
  MODULES_CONFIG_KEY,
  normalizeEnabledModules,
} from './module-access.constants';
import { MODULE_ACCESS_KEY } from './module-access.decorator';
import {
  CRM_USAGE_CONFIG_KEY,
  CRM_ENTITLEMENTS_CONFIG_KEY,
  CrmCapabilityKey,
  CrmLimitKey,
  evaluateCrmLimit,
  normalizeCrmEntitlements,
  normalizeCrmUsage,
} from './crm-entitlements.constants';
import { CRM_CAPABILITY_ACCESS_KEY } from './crm-capability-access.decorator';
import { AuthenticatedRequest } from './request.types';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private inferRequiredModulesFromPath(path: string): AppModuleKey[] {
    const normalizedPath = String(path || '').toLowerCase();

    if (normalizedPath.startsWith('/tenant/configurations/modules')) {
      return [];
    }

    const routeModuleMap: Array<{ prefixes: string[]; module: AppModuleKey }> =
      [
        { prefixes: ['/hr', '/salary-schemes', '/payroll'], module: 'payroll' },
        { prefixes: ['/sales/credits', '/credit'], module: 'credits' },
        { prefixes: ['/sales'], module: 'sales' },
        {
          prefixes: [
            '/product',
            '/products',
            '/inventory',
            '/supplier',
            '/suppliers',
          ],
          module: 'inventory',
        },
        {
          prefixes: [
            '/crm',
            '/contacts',
            '/deals',
            '/pipeline',
            '/tasks',
            '/proposals',
            '/contracts',
          ],
          module: 'crm',
        },
        { prefixes: ['/expenses'], module: 'expenses' },
        { prefixes: ['/analytics'], module: 'analytics' },
        { prefixes: ['/reports', '/api/reports'], module: 'reports' },
        { prefixes: ['/ledger', '/accounts'], module: 'accounts' },
        { prefixes: ['/ai'], module: 'ai' },
        { prefixes: ['/tenant/configurations'], module: 'settings' },
        { prefixes: ['/billing', '/subscription'], module: 'billing' },
      ];

    const matched = routeModuleMap.find((entry) =>
      entry.prefixes.some((prefix) => normalizedPath.startsWith(prefix)),
    );

    return matched ? [matched.module] : [];
  }

  private inferRequiredCrmCapabilitiesFromPath(
    path: string,
  ): CrmCapabilityKey[] {
    const normalizedPath = String(path || '').toLowerCase();

    const mapping: Array<{ prefixes: string[]; capability: CrmCapabilityKey }> =
      [
        {
          prefixes: ['/crm/pipeline', '/pipeline', '/deals'],
          capability: 'crm.pipeline',
        },
        { prefixes: ['/crm/tasks', '/tasks'], capability: 'crm.tasks' },
        {
          prefixes: ['/crm/documents', '/documents'],
          capability: 'crm.documents',
        },
        {
          prefixes: ['/crm/calendar', '/calendar'],
          capability: 'crm.calendar_integration',
        },
        {
          prefixes: ['/crm/scheduler', '/scheduler', '/meetings'],
          capability: 'crm.meeting_scheduler',
        },
        {
          prefixes: ['/crm/email', '/email'],
          capability: 'crm.email_integration',
        },
        {
          prefixes: ['/crm/reports', '/crm/analytics'],
          capability: 'crm.reporting',
        },
        {
          prefixes: ['/crm/automation', '/automation'],
          capability: 'crm.workflow_automation',
        },
        {
          prefixes: ['/crm/lead-scoring', '/lead-scoring'],
          capability: 'crm.lead_scoring',
        },
        {
          prefixes: ['/crm/telephony', '/telephony'],
          capability: 'crm.telephony',
        },
        {
          prefixes: ['/crm/proposals', '/proposals'],
          capability: 'crm.proposal_management',
        },
        {
          prefixes: ['/crm/contracts', '/contracts'],
          capability: 'crm.contract_management',
        },
        {
          prefixes: ['/crm/integrations', '/integrations/crm'],
          capability: 'crm.third_party_integrations',
        },
      ];

    const matched = mapping.find((entry) =>
      entry.prefixes.some((prefix) => normalizedPath.startsWith(prefix)),
    );

    return matched ? [matched.capability] : [];
  }

  private inferCrmProviderFromPath(
    path: string,
  ): { group: 'integrations'; provider: string } | null {
    const normalizedPath = String(path || '').toLowerCase();

    const integrationsPrefix = '/crm/integrations/';
    if (normalizedPath.startsWith(integrationsPrefix)) {
      const provider = normalizedPath
        .slice(integrationsPrefix.length)
        .split('/')[0];
      if (provider) {
        return { group: 'integrations', provider };
      }
    }

    return null;
  }

  private inferCrmLimitFromRequest(
    path: string,
    method: string,
  ): CrmLimitKey | null {
    const normalizedPath = String(path || '').toLowerCase();
    const normalizedMethod = String(method || '').toUpperCase();

    if (normalizedMethod !== 'POST') {
      return null;
    }

    if (normalizedPath.startsWith('/crm/pipeline')) return 'pipelines';
    if (normalizedPath.startsWith('/crm/automation')) return 'automationRules';
    if (normalizedPath.startsWith('/crm/integrations'))
      return 'integrationConnections';
    if (normalizedPath.startsWith('/crm/telephony/calls'))
      return 'telephonyMinutesMonthly';
    if (normalizedPath.startsWith('/crm/proposals')) return 'proposalsMonthly';
    if (normalizedPath.startsWith('/crm/contracts')) return 'contractsMonthly';

    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadataModules = this.reflector.getAllAndOverride<AppModuleKey[]>(
      MODULE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const metadataCrmCapabilities = this.reflector.getAllAndOverride<
      CrmCapabilityKey[]
    >(CRM_CAPABILITY_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const requiredModules =
      metadataModules && metadataModules.length > 0
        ? metadataModules
        : this.inferRequiredModulesFromPath(
            request?.path || request?.url || '',
          );

    const requiredCrmCapabilities =
      metadataCrmCapabilities && metadataCrmCapabilities.length > 0
        ? metadataCrmCapabilities
        : this.inferRequiredCrmCapabilitiesFromPath(
            request?.path || request?.url || '',
          );
    const inferredCrmProvider = this.inferCrmProviderFromPath(
      request?.path || request?.url || '',
    );
    const inferredCrmLimit = this.inferCrmLimitFromRequest(
      request?.path || request?.url || '',
      request?.method || '',
    );

    if (
      (!requiredModules || requiredModules.length === 0) &&
      (!requiredCrmCapabilities || requiredCrmCapabilities.length === 0) &&
      !inferredCrmProvider &&
      !inferredCrmLimit
    ) {
      return true;
    }

    const user = request.user;

    if (!user?.tenantId) {
      return true;
    }

    if (user.isSuperadmin) {
      return true;
    }

    const config = await this.prisma.tenantConfiguration.findUnique({
      where: {
        tenantId_key: {
          tenantId: user.tenantId,
          key: MODULES_CONFIG_KEY,
        },
      },
      select: { value: true },
    });

    let parsed: unknown;
    try {
      parsed = config?.value ? JSON.parse(config.value) : undefined;
    } catch {
      parsed = undefined;
    }

    const enabled = normalizeEnabledModules(parsed);
    const missing = requiredModules.filter(
      (module) => !enabled.includes(module),
    );

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Module disabled for this tenant: ${missing.join(', ')}`,
      );
    }

    if (requiredCrmCapabilities && requiredCrmCapabilities.length > 0) {
      const crmConfig = await this.prisma.tenantConfiguration.findUnique({
        where: {
          tenantId_key: {
            tenantId: user.tenantId,
            key: CRM_ENTITLEMENTS_CONFIG_KEY,
          },
        },
        select: { value: true },
      });

      let parsedCrm: unknown;
      try {
        parsedCrm = crmConfig?.value ? JSON.parse(crmConfig.value) : undefined;
      } catch {
        parsedCrm = undefined;
      }

      const crmEntitlements = normalizeCrmEntitlements(parsedCrm);
      const missingCrmCapabilities = requiredCrmCapabilities.filter(
        (capability) =>
          !crmEntitlements.enabledCapabilities.includes(capability),
      );

      if (missingCrmCapabilities.length > 0) {
        throw new ForbiddenException(
          `CRM capability disabled for this tenant: ${missingCrmCapabilities.join(', ')}`,
        );
      }

      if (inferredCrmProvider) {
        const providers =
          crmEntitlements.allowedProviders[inferredCrmProvider.group] || [];
        if (!providers.includes(inferredCrmProvider.provider)) {
          throw new ForbiddenException(
            `CRM provider disabled for this tenant: ${inferredCrmProvider.provider}`,
          );
        }
      }

      if (inferredCrmLimit) {
        const usageConfig = await this.prisma.tenantConfiguration.findUnique({
          where: {
            tenantId_key: {
              tenantId: user.tenantId,
              key: CRM_USAGE_CONFIG_KEY,
            },
          },
          select: { value: true },
        });

        let parsedUsage: unknown;
        try {
          parsedUsage = usageConfig?.value
            ? JSON.parse(usageConfig.value)
            : undefined;
        } catch {
          parsedUsage = undefined;
        }

        const usage = normalizeCrmUsage(parsedUsage);
        const limitState = evaluateCrmLimit(
          crmEntitlements.limits,
          usage,
          inferredCrmLimit,
        );

        if (limitState.warning) {
          const response = context.switchToHttp().getResponse<Response>();
          response.setHeader(
            'x-crm-limit-warning',
            `${limitState.key}:${limitState.usage}/${limitState.limit ?? 'unlimited'}`,
          );
        }

        if (limitState.blocked) {
          throw new ForbiddenException(
            `CRM limit reached for ${limitState.key}: ${limitState.usage}/${limitState.limit}`,
          );
        }
      }
    }

    return true;
  }
}
