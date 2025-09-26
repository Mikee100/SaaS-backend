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
let PermissionsGuard = class PermissionsGuard {
    reflector;
    userService;
    constructor(reflector, userService) {
        this.reflector = reflector;
        this.userService = userService;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        console.log('[PermissionsGuard] user:', JSON.stringify(user));
        const roles = Array.isArray(user.roles)
            ? user.roles.map((r) => (typeof r === 'string' ? r : r.name))
            : [];
        if (roles.includes('owner') || roles.includes('admin')) {
            console.log('[PermissionsGuard] Owner/admin bypass');
            return true;
        }
        const requiredPermissions = this.reflector.get('permissions', context.getHandler());
        if (!requiredPermissions)
            return true;
        const hasAll = requiredPermissions.every((permission) => user.permissions && user.permissions.includes(permission));
        if (!hasAll) {
            console.warn('[PermissionsGuard] Missing permissions:', requiredPermissions, 'User has:', user.permissions);
        }
        return hasAll;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        user_service_1.UserService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map