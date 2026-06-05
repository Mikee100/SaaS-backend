import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  NotFoundException,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BranchService } from './branch.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import { AuthenticatedRequest } from '../auth/request.types';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new NotFoundException('Authenticated user does not have tenantId');
    }
    return req.user.tenantId;
  }

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }
    return userId;
  }

  @Post()
  @Permissions('manage_branches')
  async createBranch(
    @Body() data: Prisma.BranchUncheckedCreateInput,
    @Req() req: AuthenticatedRequest,
  ) {
    // Inject tenantId from authenticated user (JWT)
    const tenantId = this.getTenantId(req);
    return this.branchService.createBranch({ ...data, tenantId });
  }

  @Get()
  @Permissions('view_branches')
  async getAllBranches(@Req() req: AuthenticatedRequest) {
    // If user is authenticated, filter by tenantId
    const tenantId = req.user?.tenantId;
    if (tenantId) {
      return this.branchService.getBranchesByTenant(tenantId);
    }
    // fallback: return all branches (admin use)
    return this.branchService.getAllBranches();
  }

  @Get(':id')
  @Permissions('view_branches')
  async getBranchById(@Param('id') id: string) {
    const branch = await this.branchService.getBranchById(id);
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  @Put(':id')
  @Permissions('manage_branches')
  async updateBranch(
    @Param('id') id: string,
    @Body() data: Prisma.BranchUncheckedUpdateInput,
  ) {
    return this.branchService.updateBranch(id, data);
  }

  @Post(':id/restore')
  @Permissions('manage_branches')
  async restoreBranch(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = this.getTenantId(req);
    return this.branchService.restoreBranch(id, tenantId);
  }

  @Delete(':id')
  @Permissions('manage_branches')
  async deleteBranch(@Param('id') id: string) {
    return this.branchService.deleteBranch(id);
  }

  @Post('switch/:branchId')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_branches')
  async switchBranch(
    @Param('branchId') branchId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(req);
    const userRoles = Array.isArray(req.user?.roles)
      ? req.user.roles.filter(
          (role): role is string => typeof role === 'string',
        )
      : [];

    // Verify the branch exists and user has access to it
    const branch = await this.branchService.getBranchById(branchId);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Only allow owners to switch branches
    if (!userRoles.includes('owner')) {
      throw new ForbiddenException('Only owners can switch branches');
    }

    // Update user's current branch
    return this.branchService.updateUserBranch(userId, branchId);
  }
}
