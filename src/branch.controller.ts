import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BranchService } from './branch.service';
import { AuthGuard } from '@nestjs/passport';
import { TrialGuard } from './auth/trial.guard';
import { AuthenticatedRequest } from './auth/request.types';

@UseGuards(AuthGuard('jwt'), TrialGuard)
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return req.user.tenantId;
  }

  @Post()
  async create(
    @Body() body: Prisma.BranchUncheckedCreateInput,
    @Req() req: AuthenticatedRequest,
  ) {
    // Attach tenantId from authenticated user
    return this.branchService.createBranch({
      ...body,
      tenantId: this.getTenantId(req),
    });
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    // List all branches for the tenant
    return this.branchService.findAllByTenant(this.getTenantId(req));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.branchService.findById(id, this.getTenantId(req));
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Prisma.BranchUncheckedUpdateInput,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.branchService.updateBranch(id, body, this.getTenantId(req));
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.branchService.deleteBranch(id, this.getTenantId(req));
  }
}
