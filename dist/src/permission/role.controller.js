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
exports.RoleController = void 0;
const common_1 = require("@nestjs/common");
const permission_service_1 = require("./permission.service");
const permissions_decorator_1 = require("../auth/permissions.decorator");
const permissions_guard_1 = require("../auth/permissions.guard");
const passport_1 = require("@nestjs/passport");
let RoleController = class RoleController {
    permissionService;
    constructor(permissionService) {
        this.permissionService = permissionService;
    }
    async createRole(body) {
        if (!body.name)
            throw new common_1.BadRequestException('Role name is required');
        return this.permissionService.createRole(body.name, body.description);
    }
    async getRoles() {
        return this.permissionService.getAllRoles();
    }
    async updateRole(body) {
        if (!body.name)
            throw new common_1.BadRequestException('Role name is required');
        return this.permissionService.updateRole(body.name, body.description);
    }
    async getRolePermissions(id) {
        return this.permissionService.getRolePermissions(id);
    }
    async updateRolePermissions(id, body) {
        if (!Array.isArray(body.permissions))
            throw new common_1.BadRequestException('Permissions array required');
        return this.permissionService.updateRolePermissions(id, body.permissions);
    }
};
exports.RoleController = RoleController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('edit_roles'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "createRole", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('edit_roles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "getRoles", null);
__decorate([
    (0, common_1.Put)(),
    (0, permissions_decorator_1.Permissions)('edit_roles'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Get)(':id/permissions'),
    (0, permissions_decorator_1.Permissions)('edit_roles'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "getRolePermissions", null);
__decorate([
    (0, common_1.Put)(':id/permissions'),
    (0, permissions_decorator_1.Permissions)('edit_roles'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "updateRolePermissions", null);
exports.RoleController = RoleController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('roles'),
    __metadata("design:paramtypes", [permission_service_1.PermissionService])
], RoleController);
//# sourceMappingURL=role.controller.js.map