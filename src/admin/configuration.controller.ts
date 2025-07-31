import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminGuard } from './superadmin.guard';
import { ConfigurationService, ConfigurationItem } from '../config/configuration.service';

interface UpdateConfigurationDto {
  value: string;
  description?: string;
  category?: 'security' | 'api' | 'external_services' | 'email' | 'general';
  isEncrypted?: boolean;
  isPublic?: boolean;
}

interface CreateConfigurationDto {
  key: string;
  value: string;
  description?: string;
  category: 'security' | 'api' | 'external_services' | 'email' | 'general';
  isEncrypted?: boolean;
  isPublic?: boolean;
}

@Controller('admin/configurations')
@UseGuards(AuthGuard('jwt'), SuperadminGuard)
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get()
  async getAllConfigurations() {
    return await this.configurationService.getAllConfigurations();
  }

  @Get('category/:category')
  async getConfigurationsByCategory(@Param('category') category: string) {
    return await this.configurationService.getAllConfigurations(category);
  }

  @Get(':key')
  async getConfiguration(@Param('key') key: string) {
    const value = await this.configurationService.getConfiguration(key);
    if (!value) {
      return { error: 'Configuration not found' };
    }
    return { key, value };
  }

  @Post()
  async createConfiguration(@Body() dto: CreateConfigurationDto) {
    await this.configurationService.setConfiguration(dto.key, dto.value, {
      description: dto.description,
      category: dto.category,
      isEncrypted: dto.isEncrypted || false,
      isPublic: dto.isPublic || false,
    });
    return { message: 'Configuration created successfully' };
  }

  @Put(':key')
  async updateConfiguration(
    @Param('key') key: string,
    @Body() dto: UpdateConfigurationDto
  ) {
    await this.configurationService.setConfiguration(key, dto.value, {
      description: dto.description,
      category: dto.category,
      isEncrypted: dto.isEncrypted,
      isPublic: dto.isPublic,
    });
    return { message: 'Configuration updated successfully' };
  }

  @Delete(':key')
  async deleteConfiguration(@Param('key') key: string) {
    await this.configurationService.deleteConfiguration(key);
    return { message: 'Configuration deleted successfully' };
  }

  @Post('initialize')
  async initializeDefaultConfigurations() {
    await this.configurationService.initializeDefaultConfigurations();
    return { message: 'Default configurations initialized successfully' };
  }

  @Get('categories/list')
  async getCategories() {
    return [
      { value: 'security', label: 'Security Settings' },
      { value: 'api', label: 'API Configuration' },
      { value: 'external_services', label: 'External Services' },
      { value: 'email', label: 'Email Configuration' },
      { value: 'general', label: 'General Settings' },
    ];
  }
} 