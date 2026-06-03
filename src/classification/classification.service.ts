import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateClassificationDto,
  UpdateClassificationDto,
  CreateMeasurementUnitDto,
  UpdateMeasurementUnitDto,
} from './dto/classification.dto';

type AttributeTemplate = {
  name: string;
  displayName?: string;
  type?: string;
  values: string[];
};

@Injectable()
export class ClassificationService {
  constructor(private prisma: PrismaService) {}

  private readonly fallbackVariantTemplates: AttributeTemplate[] = [
    {
      name: 'Color',
      type: 'color',
      values: ['Black', 'White', 'Brown', 'Blue', 'Red'],
    },
  ];

  private readonly variantTemplatesByKeyword: Record<string, AttributeTemplate[]> = {
    shoe: [
      {
        name: 'Size',
        displayName: 'Shoe Size',
        type: 'text',
        values: ['38', '39', '40', '41', '42', '43', '44', '45'],
      },
      {
        name: 'Color',
        type: 'color',
        values: ['Black', 'White', 'Brown', 'Blue', 'Red'],
      },
    ],
    footwear: [
      {
        name: 'Size',
        displayName: 'Shoe Size',
        type: 'text',
        values: ['38', '39', '40', '41', '42', '43', '44', '45'],
      },
      {
        name: 'Color',
        type: 'color',
        values: ['Black', 'White', 'Brown', 'Blue', 'Red'],
      },
    ],
    fashion: [
      {
        name: 'Size',
        type: 'text',
        values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      },
      {
        name: 'Color',
        type: 'color',
        values: ['Black', 'White', 'Grey', 'Blue', 'Red'],
      },
    ],
    apparel: [
      {
        name: 'Size',
        type: 'text',
        values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      },
      {
        name: 'Color',
        type: 'color',
        values: ['Black', 'White', 'Grey', 'Blue', 'Red'],
      },
    ],
    clothing: [
      {
        name: 'Size',
        type: 'text',
        values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      },
      {
        name: 'Color',
        type: 'color',
        values: ['Black', 'White', 'Grey', 'Blue', 'Red'],
      },
    ],
    pharmacy: [
      {
        name: 'Strength',
        type: 'text',
        values: ['100mg', '250mg', '500mg'],
      },
      {
        name: 'Form',
        type: 'text',
        values: ['Tablet', 'Capsule', 'Syrup', 'Injection'],
      },
    ],
    butcher: [
      {
        name: 'Cut Type',
        type: 'text',
        values: ['Steak', 'Ribs', 'Minced', 'Fillet'],
      },
    ],
    butchery: [
      {
        name: 'Cut Type',
        type: 'text',
        values: ['Steak', 'Ribs', 'Minced', 'Fillet'],
      },
    ],
  };

  private normalize(input?: string | null) {
    return (input ?? '').toLowerCase().trim();
  }

  private normalizeBusinessToken(input?: string | null) {
    return (input ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private isSameToken(a?: string | null, b?: string | null) {
    return this.normalize(a) === this.normalize(b);
  }

  private isRestaurantClassification(classification?: { slug?: string; name?: string } | null) {
    if (!classification) return false;
    const token = `${this.normalize(classification.slug)} ${this.normalize(classification.name)}`;
    return token.includes('restaurant') || token.includes('hospitality');
  }

  private mergeUnitsByAbbreviation<T extends { abbreviation: string }>(
    primary: T[],
    secondary: T[],
  ): T[] {
    const seen = new Set(primary.map((u) => this.normalize(u.abbreviation)));
    return [...primary, ...secondary.filter((u) => !seen.has(this.normalize(u.abbreviation)))];
  }

  private async findClassificationByBusinessType(businessType?: string | null) {
    const normalized = this.normalizeBusinessToken(businessType);
    if (!normalized) return null;

    const activeClassifications = await this.prisma.businessClassification.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (activeClassifications.length === 0) return null;

    const exact = activeClassifications.find(
      (c) =>
        this.normalizeBusinessToken(c.slug) === normalized ||
        this.normalizeBusinessToken(c.name) === normalized,
    );
    if (exact) return exact;

    return (
      activeClassifications.find((c) => {
        const slug = this.normalizeBusinessToken(c.slug);
        const name = this.normalizeBusinessToken(c.name);
        return normalized.includes(slug) || slug.includes(normalized) || normalized.includes(name);
      }) || null
    );
  }

  private pickTemplatesForClassification(classification: { slug: string; name: string }): AttributeTemplate[] {
    const candidate = `${this.normalize(classification.slug)} ${this.normalize(classification.name)}`;
    const templates: AttributeTemplate[] = [];

    for (const [keyword, attrs] of Object.entries(this.variantTemplatesByKeyword)) {
      if (candidate.includes(keyword)) {
        templates.push(...attrs);
      }
    }

    if (templates.length === 0) {
      return this.fallbackVariantTemplates;
    }

    const byName = new Map<string, AttributeTemplate>();
    for (const t of templates) {
      const key = this.normalize(t.name);
      if (!byName.has(key)) {
        byName.set(key, t);
      }
    }
    return Array.from(byName.values());
  }

  private async ensureVariantAttribute(
    tenantId: string,
    template: AttributeTemplate,
  ) {
    const existing = await this.prisma.productAttribute.findFirst({
      where: {
        tenantId,
        name: {
          equals: template.name,
          mode: 'insensitive',
        },
      },
      include: {
        values: true,
      },
    });

    const attribute = existing
      ? await this.prisma.productAttribute.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            deletedAt: null,
            displayName: existing.displayName || template.displayName || template.name,
            type: existing.type || template.type || 'text',
          },
          include: { values: true },
        })
      : await this.prisma.productAttribute.create({
          data: {
            name: template.name,
            displayName: template.displayName || template.name,
            type: template.type || 'text',
            tenantId,
            isActive: true,
          },
          include: { values: true },
        });

    const existingValues = new Map(
      attribute.values.map((v) => [this.normalize(v.value), v]),
    );

    for (let idx = 0; idx < template.values.length; idx += 1) {
      const val = template.values[idx];
      const normalized = this.normalize(val);
      const found = existingValues.get(normalized);

      if (!found) {
        await this.prisma.productAttributeValue.create({
          data: {
            attributeId: attribute.id,
            value: val,
            displayName: val,
            sortOrder: idx,
            isActive: true,
          },
        });
        continue;
      }

      if (!found.isActive || found.deletedAt) {
        await this.prisma.productAttributeValue.update({
          where: { id: found.id },
          data: {
            isActive: true,
            deletedAt: null,
          },
        });
      }
    }
  }

  private async provisionTenantMetricDefaults(
    tenantId: string,
    classifications: Array<{ slug: string; name: string }>,
    mergedUnits: Array<{ abbreviation: string; name: string; isBaseUnit: boolean | null }>,
  ) {
    const templatesByName = new Map<string, AttributeTemplate>();
    for (const c of classifications) {
      const templates = this.pickTemplatesForClassification(c);
      for (const t of templates) {
        const key = this.normalize(t.name);
        if (!templatesByName.has(key)) {
          templatesByName.set(key, t);
        }
      }
    }

    for (const template of templatesByName.values()) {
      await this.ensureVariantAttribute(tenantId, template);
    }

    const defaultUnit =
      mergedUnits.find((u) => Boolean(u.isBaseUnit))?.abbreviation ?? mergedUnits[0]?.abbreviation ?? null;
    const allowedUnits = mergedUnits.map((u) => u.abbreviation);

    const currentTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        measurementPreferences: true,
      },
    });
    if (!currentTenant) {
      throw new NotFoundException('Tenant not found');
    }

    const previousPrefs =
      currentTenant.measurementPreferences && typeof currentTenant.measurementPreferences === 'object'
        ? (currentTenant.measurementPreferences as Record<string, any>)
        : {};

    const mergedPrefs = {
      ...previousPrefs,
      defaultUnit: previousPrefs.defaultUnit || defaultUnit,
      allowedUnits,
      metricConfigVersion: 1,
      variantAttributes: Array.from(templatesByName.values()).map((t) => t.name),
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        measurementPreferences: mergedPrefs,
      },
    });

    return {
      provisionedAttributes: Array.from(templatesByName.values()).map((t) => t.name),
      allowedUnits,
      defaultUnit: mergedPrefs.defaultUnit,
    };
  }

  // ─── Classifications ─────────────────────────────────────────

  async findAllClassifications(includeInactive = false) {
    return this.prisma.businessClassification.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        units: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { primaryTenants: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findClassificationById(id: string) {
    const c = await this.prisma.businessClassification.findUnique({
      where: { id },
      include: {
        units: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { primaryTenants: true, secondaryTenants: true } },
      },
    });
    if (!c) throw new NotFoundException('Classification not found');
    return c;
  }

  async findClassificationBySlug(slug: string) {
    const c = await this.prisma.businessClassification.findUnique({
      where: { slug },
      include: {
        units: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!c) throw new NotFoundException(`Classification '${slug}' not found`);
    return c;
  }

  async createClassification(dto: CreateClassificationDto) {
    const existing = await this.prisma.businessClassification.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException(`Classification slug '${dto.slug}' already exists`);

    return this.prisma.businessClassification.create({
      data: {
        ...dto,
        isSystem: false, // User-created classifications are not system ones
      },
      include: { units: true },
    });
  }

  async updateClassification(id: string, dto: UpdateClassificationDto) {
    await this.findClassificationById(id);
    return this.prisma.businessClassification.update({
      where: { id },
      data: dto,
      include: { units: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteClassification(id: string) {
    const c = await this.findClassificationById(id);
    if (c.isSystem) {
      throw new BadRequestException('System classifications cannot be deleted. You can deactivate them instead.');
    }
    const tenantCount = (c as any)._count?.primaryTenants ?? 0;
    if (tenantCount > 0) {
      throw new BadRequestException(`Cannot delete: ${tenantCount} tenants use this classification`);
    }
    return this.prisma.businessClassification.delete({ where: { id } });
  }

  // ─── Measurement Units ────────────────────────────────────────

  async findUnitsByClassification(classificationId: string) {
    await this.findClassificationById(classificationId);
    return this.prisma.measurementUnit.findMany({
      where: { classificationId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createUnit(classificationId: string, dto: CreateMeasurementUnitDto) {
    await this.findClassificationById(classificationId);
    const existing = await this.prisma.measurementUnit.findUnique({
      where: { classificationId_abbreviation: { classificationId, abbreviation: dto.abbreviation } },
    });
    if (existing) throw new ConflictException(`Unit '${dto.abbreviation}' already exists in this classification`);

    return this.prisma.measurementUnit.create({
      data: { ...dto, classificationId },
    });
  }

  async updateUnit(unitId: string, dto: UpdateMeasurementUnitDto) {
    const unit = await this.prisma.measurementUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Measurement unit not found');
    return this.prisma.measurementUnit.update({ where: { id: unitId }, data: dto });
  }

  async deactivateUnit(unitId: string) {
    const unit = await this.prisma.measurementUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Measurement unit not found');
    return this.prisma.measurementUnit.update({
      where: { id: unitId },
      data: { isActive: false },
    });
  }

  // ─── Tenant Classification ────────────────────────────────────

  /**
   * Returns the classification + active units for the given tenant.
   * This is used by the POS and product pages to know what units to show.
   */
  async getTenantClassification(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        classificationId: true,
        secondaryClassificationId: true,
        measurementPreferences: true,
        classificationAssigned: true,
        classification: {
          include: {
            units: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
        secondaryClassification: {
          include: {
            units: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    // Merge primary + secondary units, removing duplicates by abbreviation
    const primaryUnits = tenant.classification?.units ?? [];
    const secondaryUnits = tenant.secondaryClassification?.units ?? [];
    const mergedUnits = this.mergeUnitsByAbbreviation(primaryUnits, secondaryUnits);

    const variantAttributes = await this.prisma.productAttribute.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        values: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      primaryClassification: tenant.classification,
      secondaryClassification: tenant.secondaryClassification,
      mergedUnits,
      measurementPreferences: tenant.measurementPreferences,
      classificationAssigned: tenant.classificationAssigned,
      variantAttributes,
    };
  }

  async assignTenantClassification(
    tenantId: string,
    classificationId: string,
    secondaryClassificationId?: string,
    measurementPreferences?: Record<string, any>,
    provisionDefaults = true,
  ) {
    // Validate classification exists
    const classification = await this.findClassificationById(classificationId);

    if (secondaryClassificationId && this.isSameToken(secondaryClassificationId, classificationId)) {
      throw new BadRequestException('Secondary classification must be different from primary classification');
    }

    const secondaryClassification = secondaryClassificationId
      ? await this.findClassificationById(secondaryClassificationId)
      : null;

    const mergedUnits = this.mergeUnitsByAbbreviation(
      classification.units,
      secondaryClassification?.units ?? [],
    );

    // Build default measurementPreferences from classification units if not provided
    const defaultPrefs = measurementPreferences ?? {
      defaultUnit:
        mergedUnits.find((u) => Boolean(u.isBaseUnit))?.abbreviation ?? mergedUnits[0]?.abbreviation,
      allowedUnits: mergedUnits.map((u) => u.abbreviation),
    };

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        classificationId,
        secondaryClassificationId: secondaryClassificationId ?? null,
        measurementPreferences: defaultPrefs,
        classificationAssigned: true,
        restaurantFeaturesEnabled:
          this.isRestaurantClassification(classification) ||
          this.isRestaurantClassification(secondaryClassification),
      },
    });

    let defaultsProvisioning: {
      provisionedAttributes: string[];
      allowedUnits: string[];
      defaultUnit: string | null;
    } | null = null;

    if (provisionDefaults) {
      defaultsProvisioning = await this.provisionTenantMetricDefaults(
        tenantId,
        [classification, ...(secondaryClassification ? [secondaryClassification] : [])],
        mergedUnits,
      );
    }

    return {
      ...updatedTenant,
      defaultsProvisioning,
    };
  }

  async syncTenantMetricDefaults(tenantId: string) {
    let tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        classification: {
          include: {
            units: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        secondaryClassification: {
          include: {
            units: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.classification) {
      const matchedClassification = await this.findClassificationByBusinessType(tenant.businessType);
      if (!matchedClassification) {
        throw new BadRequestException(
          'Primary classification is not assigned for this tenant, and no active classification matches tenant business type.',
        );
      }

      await this.assignTenantClassification(
        tenant.id,
        matchedClassification.id,
        undefined,
        undefined,
        false,
      );

      tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          classification: {
            include: {
              units: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          secondaryClassification: {
            include: {
              units: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }
      if (!tenant.classification) {
        throw new BadRequestException('Primary classification is not assigned for this tenant');
      }
    }

    const mergedUnits = this.mergeUnitsByAbbreviation(
      tenant.classification.units,
      tenant.secondaryClassification?.units ?? [],
    );

    const defaultsProvisioning = await this.provisionTenantMetricDefaults(
      tenantId,
      [tenant.classification, ...(tenant.secondaryClassification ? [tenant.secondaryClassification] : [])],
      mergedUnits,
    );

    return {
      tenantId,
      defaultsProvisioning,
    };
  }
}
