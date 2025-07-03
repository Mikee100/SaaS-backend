import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: { email: string; password: string; name: string; role: string; tenantId: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({ where: { tenantId } });
  }

  async updateUser(id: string, data: { name?: string; role?: string }, tenantId: string) {
    return this.prisma.user.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async deleteUser(id: string, tenantId: string) {
    return this.prisma.user.deleteMany({
      where: { id, tenantId },
    });
  }
}
