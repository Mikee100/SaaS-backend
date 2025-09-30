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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_services_1 = require("./auth.services");
const public_decorator_1 = require("./decorators/public.decorator");
let AuthController = AuthController_1 = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    logger = new common_1.Logger(AuthController_1.name);
    async login(body, req) {
        this.logger.log(`Login attempt for: ${body.email} from IP: ${req.ip}`);
        if (!body.email || !body.password) {
            this.logger.warn('Missing email or password in login request');
            throw new common_1.BadRequestException('Email and password are required');
        }
        const emailLower = body.email.trim().toLowerCase();
        try {
            const result = await this.authService.login(emailLower, body.password, req.ip);
            if (!result || !result.access_token) {
                this.logger.error('Login failed: No access token in response');
                throw new common_1.InternalServerErrorException('Authentication failed');
            }
            this.logger.log(`Successful login for user: ${emailLower}`);
            return result;
        }
        catch (error) {
            this.logger.error(`Login error for ${emailLower}: ${error.message}`, error.stack);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
    }
    async forgotPassword(body) {
        const emailLower = body.email.trim().toLowerCase();
        return this.authService.forgotPassword(emailLower);
    }
    async resetPassword(body) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_services_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map