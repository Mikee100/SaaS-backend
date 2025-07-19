import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAll() {
    return this.prisma.permission.findMany();
  }
} 