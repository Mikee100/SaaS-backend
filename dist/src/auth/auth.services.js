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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const user_service_1 = require("../user/user.service");
const bcrypt = require("bcrypt");
const audit_log_service_1 = require("../audit-log.service");
const uuid_1 = require("uuid");
const email_service_1 = require("../email/email.service");
let AuthService = AuthService_1 = class AuthService {
    userService;
    jwtService;
    auditLogService;
    emailService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(userService, jwtService, auditLogService, emailService) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
        this.emailService = emailService;
    }
    async validateUser(email, password) {
        const user = await this.userService.findByEmail(email);
        if (user && (await bcrypt.compare(password, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(email, password, ip) {
        try {
            const user = await this.userService.findByEmail(email, {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                        tenant: true,
                    },
                },
            });
            console.log('the user: ', user);
            if (!user || !(await bcrypt.compare(password, user.password))) {
                if (this.auditLogService) {
                    await this.auditLogService.log(null, 'login_failed', { email }, ip);
                }
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const userWithRoles = user;
            const userRoles = userWithRoles.userRoles || [];
            let tenantId = null;
            if (userRoles.length > 0 && 'tenantId' in userRoles[0]) {
                tenantId = userRoles[0].tenantId;
            }
            if (!tenantId) {
                throw new common_1.UnauthorizedException('No tenant assigned to this user. Please contact support.');
            }
            const userPermissions = [];
            try {
                const perms = await this.userService.getEffectivePermissions(user.id, tenantId);
                perms.forEach((perm) => {
                    if (perm.name)
                        userPermissions.push(perm.name);
                });
            }
            catch (error) {
                console.error('Error fetching user permissions:', error);
            }
            const roles = userRoles.map((ur) => ur.role?.name).filter(Boolean) || [];
            const payload = {
                sub: user.id,
                email: user.email,
                name: user.name || '',
                tenantId: tenantId,
                branchId: user.branchId || null,
                roles: roles,
                permissions: userPermissions,
            };
            console.log('JWT Payload:', JSON.stringify(payload, null, 2));
            const accessToken = this.jwtService.sign(payload, {
                secret: process.env.JWT_SECRET || 'waweru',
                issuer: 'saas-platform',
                audience: 'saas-platform-client',
            });
            console.log('[JWT_SECRET]', process.env.JWT_SECRET);
            console.log('Generated JWT Token:', accessToken);
            if (this.auditLogService) {
                await this.auditLogService.log(user.id, 'login_success', {
                    email: user.email,
                    tenantId: payload.tenantId,
                    branchId: payload.branchId,
                }, ip);
            }
            return {
                access_token: accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    tenantId: payload.tenantId,
                    branchId: payload.branchId,
                    roles: payload.roles,
                    permissions: payload.permissions,
                },
            };
        }
        catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
    async forgotPassword(email) {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            return {
                message: 'If an account with that email exists, a password reset link has been sent.',
            };
        }
        const resetToken = (0, uuid_1.v4)();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
        await this.userService.updateUserByEmail(email, {
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
        });
        try {
            await this.emailService.sendResetPasswordEmail(email, resetToken);
            this.logger.log(`Password reset email sent successfully to ${email}`);
        }
        catch (error) {
            this.logger.error(`Failed to send password reset email to ${email}:`, error);
            if (process.env.NODE_ENV !== 'production') {
                this.logger.log(`Password reset token for ${email}: ${resetToken}`);
                this.logger.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`);
            }
        }
        return {
            message: 'If an account with that email exists, a password reset link has been sent.',
        };
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
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService,
        jwt_1.JwtService,
        audit_log_service_1.AuditLogService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.services.js.map