import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateProductAttributeDto,
  UpdateProductAttributeDto,
  AddAttributeValueDto,
  CreateAttributeValueDto,
} from './dto/product-attribute.dto';

@Injectable()
export class ProductAttributeService {
  constructor(private prisma: PrismaService) {}

  // Get all attributes for a tenant
  async findAll(tenantId: string, includeValues: boolean = true) {
    return this.prisma.productAttribute.findMany({
      where: { tenantId, isActive: true },
      include: {
        values: includeValues
          ? {
              where: { isActive: true, deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            }
          : false,
      },
      orderBy: { name: 'asc' },
    });
  }

  // Get a single attribute by ID
  async findOne(id: string, tenantId: string) {
    const attribute = await this.prisma.productAttribute.findFirst({
      where: { id, tenantId },
      include: {
        values: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException('Product attribute not found');
    }

    return attribute;
  }

  // Create a new attribute
  async create(tenantId: string, dto: CreateProductAttributeDto) {
    // Check if attribute with same name already exists
    const existing = await this.prisma.productAttribute.findFirst({
      where: {
        name: dto.name,
        tenantId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Attribute with name "${dto.name}" already exists`,
      );
    }

    const attribute = await this.prisma.productAttribute.create({
      data: {
        id: uuidv4(),
        name: dto.name,
        displayName: dto.displayName || dto.name,
        type: dto.type || 'text',
        tenantId,
        values: dto.values
          ? {
              create: dto.values.map((val) => ({
                id: uuidv4(),
                value: val.value,
                displayName: val.displayName || val.value,
                color: val.color,
                image: val.image,
                sortOrder: val.sortOrder || 0,
              })),
            }
          : undefined,
      },
      include: {
        values: true,
      },
    });

    return attribute;
  }

  // Update an attribute
  async update(id: string, tenantId: string, dto: UpdateProductAttributeDto) {
    const attribute = await this.findOne(id, tenantId);

    return this.prisma.productAttribute.update({
      where: { id: attribute.id },
      data: {
        displayName: dto.displayName,
        type: dto.type,
        isActive: dto.isActive,
      },
      include: {
        values: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  // Delete an attribute (soft delete)
  async delete(id: string, tenantId: string) {
    const attribute = await this.findOne(id, tenantId);

    return this.prisma.productAttribute.update({
      where: { id: attribute.id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // Add a value to an attribute
  async addValue(
    attributeId: string,
    tenantId: string,
    dto: AddAttributeValueDto,
  ) {
    const attribute = await this.findOne(attributeId, tenantId);

    // Check if value already exists
    const existing = await this.prisma.productAttributeValue.findFirst({
      where: {
        attributeId: attribute.id,
        value: dto.value,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Value "${dto.value}" already exists for this attribute`,
      );
    }

    return this.prisma.productAttributeValue.create({
      data: {
        id: uuidv4(),
        attributeId: attribute.id,
        value: dto.value,
        displayName: dto.displayName || dto.value,
        color: dto.color,
        image: dto.image,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  // Update an attribute value
  async updateValue(
    valueId: string,
    tenantId: string,
    dto: Partial<AddAttributeValueDto>,
  ) {
    const value = await this.prisma.productAttributeValue.findFirst({
      where: { id: valueId },
      include: { attribute: true },
    });

    if (!value || value.attribute.tenantId !== tenantId) {
      throw new NotFoundException('Attribute value not found');
    }

    return this.prisma.productAttributeValue.update({
      where: { id: valueId },
      data: {
        value: dto.value,
        displayName: dto.displayName,
        color: dto.color,
        image: dto.image,
        sortOrder: dto.sortOrder,
      },
    });
  }

  // Delete an attribute value (soft delete)
  async deleteValue(valueId: string, tenantId: string) {
    const value = await this.prisma.productAttributeValue.findFirst({
      where: { id: valueId },
      include: { attribute: true },
    });

    if (!value || value.attribute.tenantId !== tenantId) {
      throw new NotFoundException('Attribute value not found');
    }

    return this.prisma.productAttributeValue.update({
      where: { id: valueId },
      data: { isActive: false },
    });
  }

  // Get or create common attributes (helper for quick setup)
  async getOrCreateCommonAttributes(tenantId: string) {
    const commonAttributes = [
      { name: 'Color', type: 'color', values: ['Black', 'White', 'Grey', 'Red', 'Blue'] },
      { name: 'Size', type: 'text', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'Storage', type: 'text', values: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    ];

    const results: any[] = [];

    for (const attr of commonAttributes) {
      let attribute = await this.prisma.productAttribute.findFirst({
        where: { name: attr.name, tenantId },
      });

      if (!attribute) {
        attribute = await this.prisma.productAttribute.create({
          data: {
            id: uuidv4(),
            name: attr.name,
            displayName: attr.name,
            type: attr.type,
            tenantId,
            values: {
              create: attr.values.map((val, idx) => ({
                id: uuidv4(),
                value: val,
                displayName: val,
                sortOrder: idx,
              })),
            },
          },
          include: { values: true },
        });
      }

      results.push(attribute);
    }

    return results;
  }
}
