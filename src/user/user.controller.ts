import { Controller, Post, Body, Get, Query, UseGuards, Req, Put, Delete, Param, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() body: any, @Req() req) {
    if (!['owner', 'manager'].includes(req.user.role)) throw new ForbiddenException('Not allowed');
    return this.userService.createUser({ ...body, tenantId: req.user.tenantId });
  }

  @Get()
  async getUsers(@Query('tenantId') tenantId: string) {
    return this.userService.findAllByTenant(tenantId);
  }

  @Get('protected')
  getProtected(@Req() req) {
    return { message: 'You are authenticated!', user: req.user };
  }

  @Put(':id')
  @Roles('owner', 'manager')
  async updateUser(@Req() req, @Param('id') id: string, @Body() body: { name?: string; role?: string }) {
    if (!['owner', 'manager'].includes(req.user.role)) throw new ForbiddenException('Not allowed');
    const tenantId = req.user.tenantId;
    return this.userService.updateUser(id, body, tenantId);
  }

  @Put(':id/permissions')
  async updatePermissions(@Param('id') id: string, @Body() body: { permissions: { key: string; note?: string }[] }, @Req() req) {
    if (!['owner', 'manager'].includes(req.user.role)) throw new ForbiddenException('Not allowed');
    return this.userService.updateUserPermissions(id, body.permissions, req.user.userId);
  }

  @Get(':id/permissions')
  async getUserPermissions(@Param('id') id: string, @Req() req) {
    // Only allow if the requester is owner/manager or the user themselves
    if (!['owner', 'manager'].includes(req.user.role) && req.user.userId !== id) {
      throw new ForbiddenException('Not allowed');
    }
    return this.userService.getUserPermissions(id);
  }

  @Delete(':id')
  @Roles('owner', 'manager')
  async deleteUser(@Req() req, @Param('id') id: string) {
    if (!['owner', 'manager'].includes(req.user.role)) throw new ForbiddenException('Not allowed');
    const tenantId = req.user.tenantId;
    return this.userService.deleteUser(id, tenantId);
  }
} 