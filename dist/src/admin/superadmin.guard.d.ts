import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
export declare class SuperadminGuard implements CanActivate {
    private prisma;
    constructor(prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
