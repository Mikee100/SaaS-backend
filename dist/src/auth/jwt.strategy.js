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
var JwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const configuration_service_1 = require("../config/configuration.service");
let JwtStrategy = JwtStrategy_1 = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    configurationService;
    logger = new common_1.Logger(JwtStrategy_1.name);
    constructor(configurationService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret',
            passReqToCallback: true,
        });
        this.configurationService = configurationService;
        this.logger.log('JWT Strategy initialized');
    }
    async onModuleInit() {
        try {
            const secret = await this.configurationService.getJwtSecret();
            this._strategy._secretOrKey = secret;
        }
        catch (error) {
            console.warn('JWT_SECRET not configured, using fallback');
        }
    }
    async validate(req, payload) {
        this.logger.debug('Validating JWT payload');
        if (!payload) {
            this.logger.error('Empty JWT payload');
            throw new common_1.UnauthorizedException('Invalid token: No payload');
        }
        if (!payload.sub) {
            this.logger.error('Missing sub in JWT payload');
            throw new common_1.UnauthorizedException('Invalid token: Missing subject');
        }
        const roles = Array.isArray(payload.roles) ? payload.roles : [];
        const user = {
            id: payload.sub,
            email: payload.email || null,
            name: payload.name || null,
            tenantId: payload.tenantId || null,
            roles: roles,
        };
        this.logger.debug(`Validated user: ${user.email || user.id}`);
        return user;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = JwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [configuration_service_1.ConfigurationService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map