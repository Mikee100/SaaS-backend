import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BulkUploadRecordService } from './bulk-upload-record.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('bulk-upload-records')
export class BulkUploadRecordController {
  constructor(
    private readonly bulkUploadRecordService: BulkUploadRecordService,
  ) {}

  @Get()
  @Permissions('view_products')
  async getBulkUploadRecords(@Req() req) {
    const branchId = req.headers['x-branch-id'] || req.user.branchId;
    return this.bulkUploadRecordService.getBulkUploadRecords(
      req.user.tenantId,
      branchId,
    );
  }

  @Get(':id')
  @Permissions('view_products')
  async getBulkUploadRecord(@Param('id') id: string, @Req() req) {
    return this.bulkUploadRecordService.getBulkUploadRecord(
      id,
      req.user.tenantId,
    );
  }

  @Put(':id/assign-supplier')
  @Permissions('manage_products')
  async assignSupplier(
    @Param('id') id: string,
    @Body() body: { supplierId: string },
    @Req() req,
  ) {
    return this.bulkUploadRecordService.assignSupplierToBulkUploadRecord(
      id,
      body.supplierId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
