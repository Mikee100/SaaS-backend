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
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const user_service_1 = require("../user/user.service");
const passport_1 = require("@nestjs/passport");
const permissions_decorator_1 = require("./decorators/permissions.decorator");
let PermissionsGuard = class PermissionsGuard extends (0, passport_1.AuthGuard)('jwt') {
    reflector;
    userService;
    constructor(reflector, userService) {
        super();
        this.reflector = reflector;
        this.userService = userService;
    }
    async canActivate(context) {
        const isPublic = this.reflector.get('isPublic', context.getHandler());
        if (isPublic) {
            console.log('[PermissionsGuard] isPublic route');
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        console.log('[PermissionsGuard] user:', user);
        if (!user) {
            console.log('[PermissionsGuard] No user found');
            throw new common_1.UnauthorizedException('Authentication required');
        }
        const userId = user.id || user.sub;
        const tenantId = user.tenantId;
        console.log('[PermissionsGuard] userId:', userId, 'tenantId:', tenantId);
        if (!userId) {
            console.log('[PermissionsGuard] No userId');
            throw new common_1.ForbiddenException('Invalid user identification in token');
        }
        const userRoles = Array.isArray(user.roles) ? user.roles : [];
        console.log('[PermissionsGuard] userRoles:', userRoles);
        if (userRoles.includes('owner') || userRoles.includes('admin')) {
            console.log('[PermissionsGuard] Owner/admin bypass');
            return true;
        }
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
        console.log('[PermissionsGuard] requiredPermissions:', requiredPermissions);
        if (!requiredPermissions?.length) {
            console.log('[PermissionsGuard] No permissions required, allowing');
            return true;
        }
        try {
            const permissions = await this.userService.getEffectivePermissions(userId, tenantId);
            const userPermissions = permissions.map(p => p.name).filter(Boolean);
            const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
            if (!hasPermission) {
                throw new common_1.ForbiddenException('Insufficient permissions');
            }
            return true;
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.ForbiddenException('Error checking permissions');
        }
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        user_service_1.UserService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map