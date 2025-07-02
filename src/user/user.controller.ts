import { Controller, Post, Body, Get, Query, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';

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

  @UseGuards(AuthGuard('jwt'))
  @Get('protected')
  getProtected(@Req() req) {
    return { message: 'You are authenticated!', user: req.user };
  }
} 