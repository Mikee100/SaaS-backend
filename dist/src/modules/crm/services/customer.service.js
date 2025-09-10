"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma.service");
let CustomerService = class CustomerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapToDto(customer) {
        return {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email || undefined,
            phone: customer.phone || undefined,
            address: customer.address || undefined,
            city: customer.city || undefined,
            country: customer.country || undefined,
            postalCode: customer.postalCode || undefined,
            notes: customer.notes || undefined,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
            totalPurchases: customer._count?.purchases || 0,
            totalSpent: customer.purchases?.reduce((sum, p) => sum + (p.totalAmount || 0), 0) || 0,
            loyaltyPoints: customer.loyalty?.points || 0,
        };
    }
    async create(tenantId, createCustomerDto) {
        const { emailMarketingOptIn, smsMarketingOptIn, ...customerData } = createCustomerDto;
        const customer = await this.prisma.customer.create({
            data: {
                ...customerData,
                tenant: { connect: { id: tenantId } },
            },
            include: {
                _count: {
                    select: { purchases: true },
                },
                purchases: true,
                loyalty: true,
            },
        });
        return this.mapToDto(customer);
    }
    async findAll(tenantId, page = 1, limit = 10, search) {
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }
        const [total, customers] = await Promise.all([
            this.prisma.customer.count({ where }),
            this.prisma.customer.findMany({
                where,
                skip,
                take: limit,
                include: {
                    _count: {
                        select: { purchases: true },
                    },
                    purchases: {
                        select: {
                            id: true,
                            totalAmount: true,
                            createdAt: true,
                        },
                    },
                    loyalty: {
                        select: {
                            id: true,
                            points: true,
                            totalPointsEarned: true,
                            totalPointsRedeemed: true,
                            lastActivityAt: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return {
            data: customers.map(customer => this.mapToDto(customer)),
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }
    async findOne(tenantId, id) {
        const customer = await this.prisma.customer.findUnique({
            where: { id, tenantId },
            include: {
                _count: {
                    select: { purchases: true },
                },
                purchases: {
                    include: {
                        sale: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 10,
                },
                loyalty: {
                    select: {
                        id: true,
                        points: true,
                        totalPointsEarned: true,
                        totalPointsRedeemed: true,
                        lastActivityAt: true,
                    }
                },
                feedbacks: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        return this.mapToDto(customer);
    }
    async update(tenantId, id, updateCustomerDto) {
        await this.findOne(tenantId, id);
        const customer = await this.prisma.customer.update({
            where: { id, tenantId },
            data: updateCustomerDto,
            include: {
                _count: {
                    select: { purchases: true },
                },
                purchases: true,
                loyalty: true,
            },
        });
        return this.mapToDto(customer);
    }
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        await this.prisma.customer.delete({
            where: { id, tenantId },
        });
    }
    async getCustomerStats(tenantId) {
        const [totalCustomers, recentCustomers, topCustomers,] = await Promise.all([
            this.prisma.customer.count({ where: { tenantId } }),
            this.prisma.customer.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            this.prisma.$queryRaw `
        SELECT c.*, SUM(p."totalAmount") as total_spent
        FROM "Customer" c
        LEFT JOIN "Purchase" p ON c.id = p."customerId"
        WHERE c."tenantId" = ${tenantId}
        GROUP BY c.id
        ORDER BY total_spent DESC NULLS LAST
        LIMIT 5
      `,
        ]);
        const customerGrowth = recentCustomers.length
            ? ((recentCustomers.length - 5) / 5) * 100
            : 100;
        return {
            totalCustomers,
            customerGrowth: Math.round(customerGrowth * 100) / 100,
            recentCustomers: recentCustomers.map(customer => this.mapToDto(customer)),
            topCustomers,
        };
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomerService);
//# sourceMappingURL=customer.service.js.map