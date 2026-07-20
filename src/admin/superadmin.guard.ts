import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { hasRequiredAdminRole } from './admin-role.guard';

@Injectable()
export class SuperadminGuard implements CanActivate {
  private readonly logger = new Logger(SuperadminGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: Record<string, unknown>;
    }>();

    const allowed = await hasRequiredAdminRole(this.prisma, request.user, [
      AdminRole.SUPERADMIN,
    ]);

    const userId =
      request.user?.userId ??
      request.user?.sub ??
      request.user?.id ??
      'unknown';
    this.logger.debug(`user=${String(userId)} allowed=${allowed}`);

    return allowed;
  }
}
