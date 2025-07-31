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
exports.ConfigurationController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const superadmin_guard_1 = require("./superadmin.guard");
const configuration_service_1 = require("../config/configuration.service");
let ConfigurationController = class ConfigurationController {
    configurationService;
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    async getAllConfigurations() {
        return await this.configurationService.getAllConfigurations();
    }
    async getConfigurationsByCategory(category) {
        return await this.configurationService.getAllConfigurations(category);
    }
    async getConfiguration(key) {
        const value = await this.configurationService.getConfiguration(key);
        if (!value) {
            return { error: 'Configuration not found' };
        }
        return { key, value };
    }
    async createConfiguration(dto) {
        await this.configurationService.setConfiguration(dto.key, dto.value, {
            description: dto.description,
            category: dto.category,
            isEncrypted: dto.isEncrypted || false,
            isPublic: dto.isPublic || false,
        });
        return { message: 'Configuration created successfully' };
    }
    async updateConfiguration(key, dto) {
        await this.configurationService.setConfiguration(key, dto.value, {
            description: dto.description,
            category: dto.category,
            isEncrypted: dto.isEncrypted,
            isPublic: dto.isPublic,
        });
        return { message: 'Configuration updated successfully' };
    }
    async deleteConfiguration(key) {
        await this.configurationService.deleteConfiguration(key);
        return { message: 'Configuration deleted successfully' };
    }
    async initializeDefaultConfigurations() {
        await this.configurationService.initializeDefaultConfigurations();
        return { message: 'Default configurations initialized successfully' };
    }
    async getCategories() {
        return [
            { value: 'security', label: 'Security Settings' },
            { value: 'api', label: 'API Configuration' },
            { value: 'external_services', label: 'External Services' },
            { value: 'email', label: 'Email Configuration' },
            { value: 'general', label: 'General Settings' },
        ];
    }
};
exports.ConfigurationController = ConfigurationController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConfigurationController.prototype, "getAllConfigurations", null);
__decorate([
    (0, common_1.Get)('category/:category'),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConfigurationController.prototype, "getConfigurationsByCategory", null);
__decorate([
    (0, common_1.Get)(':key'),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConfigurationController.prototype, "getConfiguration", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConfigurationController.prototype, "createConfiguration", null);
__decorate([
    (0, common_1.Put)(':key'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConfigurationController.prototype, "updateConfiguration", null);
__decorate([
    (0, common_1.Delete)(':key'),
    __param(0, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConfigurationController.prototype, "deleteConfiguration", null);
__decorate([
    (0, common_1.Post)('initialize'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConfigurationController.prototype, "initializeDefaultConfigurations", null);
__decorate([
    (0, common_1.Get)('categories/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ConfigurationController.prototype, "getCategories", null);
exports.ConfigurationController = ConfigurationController = __decorate([
    (0, common_1.Controller)('admin/configurations'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), superadmin_guard_1.SuperadminGuard),
    __metadata("design:paramtypes", [configuration_service_1.ConfigurationService])
], ConfigurationController);
//# sourceMappingURL=configuration.controller.js.map