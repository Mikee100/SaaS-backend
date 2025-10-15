import {
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
import { BranchService } from './branch.service';
import { AuthGuard } from '@nestjs/passport';
import { TrialGuard } from './auth/trial.guard';

@UseGuards(AuthGuard('jwt'), TrialGuard)
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  async create(@Body() body, @Req() req) {
    // Attach tenantId from authenticated user
    return this.branchService.createBranch({
      ...body,
      tenantId: req.user.tenantId,
    });
  }

  @Get()
  async findAll(@Req() req) {
    // List all branches for the tenant
    return this.branchService.findAllByTenant(req.user.tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.branchService.findById(id, req.user.tenantId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body, @Req() req) {
    return this.branchService.updateBranch(id, body, req.user.tenantId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.branchService.deleteBranch(id, req.user.tenantId);
  }
}
