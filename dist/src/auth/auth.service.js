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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const user_service_1 = require("../user/user.service");
const bcrypt = require("bcrypt");
const audit_log_service_1 = require("../audit-log.service");
const uuid_1 = require("uuid");
let AuthService = class AuthService {
    userService;
    jwtService;
    auditLogService;
    constructor(userService, jwtService, auditLogService) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
    }
    async validateUser(email, password) {
        const user = await this.userService.findByEmail(email);
        if (user && await bcrypt.compare(password, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(email, password, ip) {
        const user = await this.userService.findByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            if (this.auditLogService) {
                await this.auditLogService.log(null, 'login_failed', { email }, ip);
            }
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const userRoles = await this.userService.getUserRoles(user.id);
        if (userRoles.length === 0) {
            throw new common_1.UnauthorizedException('User has no assigned roles or tenant.');
        }
        const payload = {
            email: user.email,
            sub: user.id,
            roles: userRoles.map(ur => ur.role.name),
            tenantId: userRoles[0].tenantId,
        };
        if (this.auditLogService) {
            await this.auditLogService.log(user.id, 'login_success', { email: user.email }, ip);
        }
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }
    async forgotPassword(email) {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            return { message: 'If an account with that email exists, a password reset link has been sent.' };
        }
        const resetToken = (0, uuid_1.v4)();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
        await this.userService.updateUserByEmail(email, {
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
        });
        console.log(`Password reset token for ${email}: ${resetToken}`);
        console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`);
        return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }
    async resetPassword(token, newPassword) {
        try {
            await this.userService.resetPassword(token, newPassword);
            return { message: 'Password has been reset successfully.' };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid or expired reset token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        jwt_1.JwtService,
        audit_log_service_1.AuditLogService])
], AuthService);
//# sourceMappingURL=auth.service.js.map