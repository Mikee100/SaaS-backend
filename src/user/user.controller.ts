import { Controller, Post, Body, Get, Query, UseGuards, Req, Put, Delete, Param, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async createUser(@Body() body: any, @Req() req) {
    // Use the current tenant from JWT
    return this.userService.createUser({ ...body, tenantId: req.user.tenantId }, req.user.userId, req.ip);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('view_users')
  async getUsers(@Req() req) {
    // Use the tenantId from the JWT token
    const tenantId = req.user.tenantId;
    console.log(`Fetching users for tenant: ${tenantId}`);
    const users = await this.userService.findAllByTenant(tenantId);
    console.log(`Found ${users.length} users for tenant: ${tenantId}`);
    return users;
  }

  @Get('protected')
  @UseGuards(AuthGuard('jwt'))
  getProtected(@Req() req) {
    return { message: 'You are authenticated!', user: req.user };
  }

  // In user.controller.ts
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req) {
    console.log('=== getMe called ===');
    
    try {
      if (!req.user) {
        console.error('No user object in request');
        throw new UnauthorizedException('No authentication data found');
      }

      // Return minimal user data from JWT
      return {
        id: req.user.id || req.user.sub,
        email: req.user.email,
        name: req.user.name || null,
        tenantId: req.user.tenantId || null,
        roles: Array.isArray(req.user.roles) ? req.user.roles : []
      };
      
    } catch (error) {
      console.error('Error in getMe:', error);
      throw new InternalServerErrorException({
        statusCode: 500,
        message: 'Error retrieving user data',
        error: error.message
      });
    }
  }



  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async updateUser(@Req() req, @Param('id') id: string, @Body() body: { name?: string; role?: string }) {
    const tenantId = req.user.tenantId;
    return this.userService.updateUser(id, body, tenantId, req.user.userId, req.ip);
  }

  @Put(':id/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async updatePermissions(@Param('id') id: string, @Body() body: { permissions: { key: string; note?: string }[] }, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.userService.updateUserPermissionsByTenant(id, body.permissions, tenantId, req.user.userId, req.ip);
  }

  @Get(':id/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async getUserPermissions(@Param('id') id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    return this.userService.getUserPermissionsByTenant(id, tenantId);
  }

  @Put('me/preferences')
  @UseGuards(AuthGuard('jwt'))
  async updatePreferences(@Req() req, @Body() body: { notificationPreferences?: any, language?: string, region?: string }) {
    return this.userService.updateUserPreferences(req.user.userId, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('edit_users')
  async deleteUser(@Req() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.userService.deleteUser(id, tenantId, req.user.userId, req.ip);
  }
} 