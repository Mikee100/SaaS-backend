import { Controller, Post, Body, Get, Query, UseGuards, Req, Put, Delete, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() body: { email: string; password: string; name: string; role: string; tenantId: string }) {
    return this.userService.createUser(body);
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
    const tenantId = req.user.tenantId;
    return this.userService.updateUser(id, body, tenantId);
  }

  @Delete(':id')
  @Roles('owner', 'manager')
  async deleteUser(@Req() req, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.userService.deleteUser(id, tenantId);
  }
} 