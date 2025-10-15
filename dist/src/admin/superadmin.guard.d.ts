import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
export declare class SuperadminGuard implements CanActivate {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
