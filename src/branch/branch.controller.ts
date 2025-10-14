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
import { BranchService } from './branch.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('api/branches') // <-- change this line
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  async createBranch(@Body() data: any, @Req() req: any) {
    // Inject tenantId from authenticated user (JWT)
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new NotFoundException('Authenticated user does not have tenantId');
    }
    return this.branchService.createBranch({ ...data, tenantId });
  }

  @Get()
  async getAllBranches(@Req() req: any) {
    // If user is authenticated, filter by tenantId
    const tenantId = req.user?.tenantId;
    if (tenantId) {
      return this.branchService.getBranchesByTenant(tenantId);
    }
    // fallback: return all branches (admin use)
    return this.branchService.getAllBranches();
  }

  @Get(':id')
  async getBranchById(@Param('id') id: string) {
    const branch = await this.branchService.getBranchById(id);
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  @Put(':id')
  async updateBranch(@Param('id') id: string, @Body() data: any) {
    return this.branchService.updateBranch(id, data);
  }

  @Delete(':id')
  async deleteBranch(@Param('id') id: string) {
    return this.branchService.deleteBranch(id);
  }

  @Post('switch/:branchId')
  @UseGuards(PermissionsGuard)
  @Permissions('manage_branches')
  async switchBranch(@Param('branchId') branchId: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    const userRoles = Array.isArray(req.user?.roles) ? req.user.roles : [];

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Verify the branch exists and user has access to it
    const branch = await this.branchService.getBranchById(branchId);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Only allow owners to switch branches
    if (!userRoles.includes('owner')) {
      throw new ForbiddenException(
        'Only owners can switch branches',
      );
    }

    // Update user's current branch
    return this.branchService.updateUserBranch(userId, branchId);
  }
}
