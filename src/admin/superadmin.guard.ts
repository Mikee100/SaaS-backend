import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Check if user is superadmin
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isSuperadmin: true },
    });

    return dbUser?.isSuperadmin === true;
  }
}
