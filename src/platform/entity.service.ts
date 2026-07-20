import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../auth/request.types';
import { BlueprintService } from './blueprint.service';
import { EntityTypeKey } from './blueprint-registry.constants';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { PlatformSalesEngine } from './engines/sales.engine';

interface PlatformEntityRecord {
  id: string;
  tenantId: string;
  entityType: EntityTypeKey;
  name: string;
  category?: string;
  sku?: string;
  basePrice: number;
  quantity: number;
  attributes: Record<string, unknown>;
  variantAttributes: Array<Record<string, unknown>>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EntityService {
  private readonly entityStore = new Map<string, PlatformEntityRecord[]>();

  constructor(
    private readonly blueprintService: BlueprintService,
    private readonly salesEngine: PlatformSalesEngine,
  ) {}

  private getTenantIdFromUser(user?: AuthenticatedUser): string {
    const tenantId = String(user?.tenantId || '').trim();
    if (!tenantId) {
      throw new BadRequestException('Authenticated tenant context is required');
    }
    return tenantId;
  }

  private async validateEntityType(
    tenantId: string,
    rawEntityType: string,
  ): Promise<EntityTypeKey> {
    const entityType = String(rawEntityType || '')
      .trim()
      .toUpperCase() as EntityTypeKey;
    const blueprint =
      await this.blueprintService.resolveBlueprintForTenant(tenantId);
    const allowed = blueprint.entityContracts.some(
      (entry) => entry.entityType === entityType,
    );

    if (!allowed) {
      throw new BadRequestException(
        `Unknown or disallowed entity type ${entityType} for blueprint ${blueprint.key}`,
      );
    }

    return entityType;
  }

  private ensureRequiredFields(dto: CreateEntityDto, requiredFields: string[]) {
    for (const field of requiredFields) {
      const value = (dto as unknown as Record<string, unknown>)[field];
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }
  }

  async create(dto: CreateEntityDto, user?: AuthenticatedUser) {
    const tenantId = this.getTenantIdFromUser(user);
    const entityType = await this.validateEntityType(tenantId, dto.entityType);
    const blueprint =
      await this.blueprintService.resolveBlueprintForTenant(tenantId);
    const contract = blueprint.entityContracts.find(
      (entry) => entry.entityType === entityType,
    );

    if (!contract) {
      throw new BadRequestException(
        'Entity contract not found for selected type',
      );
    }

    this.ensureRequiredFields(dto, contract.requiredFields);

    const record: PlatformEntityRecord = {
      id: randomUUID(),
      tenantId,
      entityType,
      name: dto.name,
      category: dto.category,
      sku: dto.sku,
      basePrice: dto.basePrice,
      quantity: dto.quantity ?? 0,
      attributes: dto.attributes || {},
      variantAttributes: Array.isArray(dto.variantAttributes)
        ? dto.variantAttributes
        : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const current = this.entityStore.get(tenantId) || [];
    current.push(record);
    this.entityStore.set(tenantId, current);

    return record;
  }

  async update(id: string, dto: UpdateEntityDto, user?: AuthenticatedUser) {
    const tenantId = this.getTenantIdFromUser(user);
    const current = this.entityStore.get(tenantId) || [];
    const index = current.findIndex((entry) => entry.id === id);

    if (index < 0) {
      throw new NotFoundException('Entity not found');
    }

    const existing = current[index];
    const updated: PlatformEntityRecord = {
      ...existing,
      ...dto,
      entityType: existing.entityType,
      updatedAt: new Date(),
      attributes: dto.attributes || existing.attributes,
      variantAttributes: Array.isArray(dto.variantAttributes)
        ? dto.variantAttributes
        : existing.variantAttributes,
      quantity:
        typeof dto.quantity === 'number' ? dto.quantity : existing.quantity,
      basePrice:
        typeof dto.basePrice === 'number' ? dto.basePrice : existing.basePrice,
      name: dto.name || existing.name,
      category: dto.category || existing.category,
      sku: dto.sku || existing.sku,
    };

    current[index] = updated;
    this.entityStore.set(tenantId, current);

    return updated;
  }

  async list(user?: AuthenticatedUser) {
    const tenantId = this.getTenantIdFromUser(user);
    return this.entityStore.get(tenantId) || [];
  }

  async getWorkflow(entityType: string, user?: AuthenticatedUser) {
    const tenantId = this.getTenantIdFromUser(user);
    const normalized = String(entityType || '')
      .trim()
      .toUpperCase() as EntityTypeKey;
    const workflow = await this.blueprintService.getWorkflowSteps(
      tenantId,
      normalized,
    );
    return {
      tenantId,
      entityType: normalized,
      workflow,
    };
  }

  async executeSale(
    payload: {
      entityType: string;
      quantity: number;
      basePrice: number;
      branchId?: string;
    },
    user?: AuthenticatedUser,
  ) {
    const tenantId = this.getTenantIdFromUser(user);
    const entityType = await this.validateEntityType(
      tenantId,
      payload.entityType,
    );

    return this.salesEngine.execute({
      tenantId,
      entityType,
      quantity: payload.quantity,
      basePrice: payload.basePrice,
      branchId: payload.branchId || null,
    });
  }
}
