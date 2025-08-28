import { Controller, Get, Post, Put, Delete, Param, Body, NotFoundException, UseGuards, Req } from '@nestjs/common';
import { BranchService } from './branch.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('branches')
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
}
