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
exports.BranchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let BranchService = class BranchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createBranch(data) {
        const branchData = { ...data };
        if ('tenant' in branchData)
            delete branchData.tenant;
        if (!branchData.tenantId)
            throw new Error('tenantId is required to create a branch');
        return this.prisma.branch.create({ data: branchData });
    }
    async getAllBranches() {
        return this.prisma.branch.findMany();
    }
    async getBranchesByTenant(tenantId) {
        return this.prisma.branch.findMany({ where: { tenantId } });
    }
    async getBranchById(id) {
        return this.prisma.branch.findUnique({ where: { id } });
    }
    async updateBranch(id, data) {
        return this.prisma.branch.update({ where: { id }, data });
    }
    async deleteBranch(id) {
        return this.prisma.branch.delete({ where: { id } });
    }
    async updateUserBranch(userId, branchId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { tenant: true }
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.tenantId) {
            throw new common_1.NotFoundException('User is not associated with any tenant');
        }
        const branch = await this.prisma.branch.findFirst({
            where: {
                id: branchId,
                tenantId: user.tenantId
            }
        });
        if (!branch) {
            throw new common_1.NotFoundException('Branch not found or not accessible');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                branch: {
                    connect: { id: branchId }
                }
            },
            select: {
                id: true,
                email: true,
                name: true,
                branch: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            }
        });
    }
};
exports.BranchService = BranchService;
exports.BranchService = BranchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BranchService);
//# sourceMappingURL=branch.service.js.map