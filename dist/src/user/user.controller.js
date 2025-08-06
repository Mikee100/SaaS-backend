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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
const passport_1 = require("@nestjs/passport");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async createUser(body, req) {
        return this.userService.createUser({ ...body, tenantId: req.user.tenantId }, req.user.userId, req.ip);
    }
    async getUsers(req) {
        const tenantId = req.user.tenantId;
        console.log(`Fetching users for tenant: ${tenantId}`);
        const users = await this.userService.findAllByTenant(tenantId);
        console.log(`Found ${users.length} users for tenant: ${tenantId}`);
        return users;
    }
    getProtected(req) {
        return { message: 'You are authenticated!', user: req.user };
    }
    async getMe(req) {
        const user = await this.userService.findByEmail(req.user.email);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const permissions = await this.userService.getUserPermissions(user.id);
        return {
            ...user,
            permissions: permissions.map(p => ({ key: p.permission.key }))
        };
    }
    async updateUser(req, id, body) {
        const tenantId = req.user.tenantId;
        return this.userService.updateUser(id, body, tenantId, req.user.userId, req.ip);
    }
    async updatePermissions(id, body, req) {
        const tenantId = req.user.tenantId;
        return this.userService.updateUserPermissionsByTenant(id, body.permissions, tenantId, req.user.userId, req.ip);
    }
    async getUserPermissions(id, req) {
        const tenantId = req.user.tenantId;
        return this.userService.getUserPermissionsByTenant(id, tenantId);
    }
    async updatePreferences(req, body) {
        return this.userService.updateUserPreferences(req.user.userId, body);
    }
    async deleteUser(req, id) {
        const tenantId = req.user.tenantId;
        return this.userService.deleteUser(id, tenantId, req.user.userId, req.ip);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('edit_users'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "createUser", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('view_users'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)('protected'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "getProtected", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getMe", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('edit_users'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Put)(':id/permissions'),
    (0, permissions_decorator_1.Permissions)('edit_users'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updatePermissions", null);
__decorate([
    (0, common_1.Get)(':id/permissions'),
    (0, permissions_decorator_1.Permissions)('edit_users'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserPermissions", null);
__decorate([
    (0, common_1.Put)('me/preferences'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('edit_users'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteUser", null);
exports.UserController = UserController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('user'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map