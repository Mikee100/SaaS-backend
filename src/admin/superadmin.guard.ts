import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SuperadminGuard implements CanActivate {
  private readonly logger = new Logger(SuperadminGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.log(`SuperadminGuard: Checking user: ${JSON.stringify(user)}`);

    if (!user) {
      this.logger.warn('SuperadminGuard: No user found in request');
      return false;
    }

    // Check JWT payload first for isSuperadmin flag
    if (user.isSuperadmin === true) {
      this.logger.log(
        `SuperadminGuard: User ${user.email} is superadmin from JWT`,
      );
      return true;
    }

    // Fallback: Check database if JWT doesn't have the flag
    const userId = user.userId || user.sub || user.id;
    if (!userId) {
      this.logger.warn('SuperadminGuard: User has no userId, sub, or id field');
      return false;
    }

    // Check if user is superadmin
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperadmin: true, email: true },
    });

    this.logger.log(
      `SuperadminGuard: DB user result: ${JSON.stringify(dbUser)}`,
    );

    const isSuperadmin = dbUser?.isSuperadmin === true;
    this.logger.log(
      `SuperadminGuard: User ${user.email} isSuperadmin: ${isSuperadmin}`,
    );

    return isSuperadmin;
  }
}
