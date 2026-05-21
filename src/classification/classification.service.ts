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

@Injectable()
export class ClassificationService {
  constructor(private prisma: PrismaService) {}

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
    const seenAbbr = new Set(primaryUnits.map((u) => u.abbreviation));
    const mergedUnits = [
      ...primaryUnits,
      ...secondaryUnits.filter((u) => !seenAbbr.has(u.abbreviation)),
    ];

    return {
      primaryClassification: tenant.classification,
      secondaryClassification: tenant.secondaryClassification,
      mergedUnits,
      measurementPreferences: tenant.measurementPreferences,
      classificationAssigned: tenant.classificationAssigned,
    };
  }

  async assignTenantClassification(
    tenantId: string,
    classificationId: string,
    secondaryClassificationId?: string,
    measurementPreferences?: Record<string, any>,
  ) {
    // Validate classification exists
    const classification = await this.findClassificationById(classificationId);

    // Build default measurementPreferences from classification units if not provided
    const defaultPrefs = measurementPreferences ?? {
      defaultUnit: classification.units.find((u) => u.isBaseUnit)?.abbreviation ?? classification.units[0]?.abbreviation,
      allowedUnits: classification.units.map((u) => u.abbreviation),
    };

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        classificationId,
        secondaryClassificationId: secondaryClassificationId ?? null,
        measurementPreferences: defaultPrefs,
        classificationAssigned: true,
      },
    });
  }
}
