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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = require("bcrypt");
let UserService = class UserService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createUser(data) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({ where: { email } });
    }
    async findAllByTenant(tenantId) {
        return this.prisma.user.findMany({ where: { tenantId } });
    }
    async updateUser(id, data, tenantId) {
        return this.prisma.user.updateMany({
            where: { id, tenantId },
            data,
        });
    }
    async updateUserPermissions(userId, permissions, grantedBy) {
        const keys = permissions.map(p => p.key);
        const allPerms = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
        await this.prisma.userPermission.deleteMany({ where: { userId } });
        await Promise.all(permissions.map(async (p) => {
            const perm = allPerms.find(ap => ap.key === p.key);
            if (perm) {
                await this.prisma.userPermission.create({
                    data: {
                        userId,
                        permissionId: perm.id,
                        grantedBy,
                        grantedAt: new Date(),
                        note: p.note || null,
                    },
                });
            }
        }));
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { permissions: { include: { permission: true } } },
        });
    }
    async deleteUser(id, tenantId) {
        return this.prisma.user.deleteMany({
            where: { id, tenantId },
        });
    }
    async getUserPermissions(userId) {
        return this.prisma.userPermission.findMany({
            where: { userId },
            include: { permission: true },
        });
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserService);
//# sourceMappingURL=user.service.js.map