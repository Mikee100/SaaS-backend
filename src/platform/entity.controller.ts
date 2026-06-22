import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from '../auth/request.types';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { BlueprintService } from './blueprint.service';
import { EntityService } from './entity.service';

@Controller('platform')
@UseGuards(AuthGuard('jwt'))
export class EntityController {
  constructor(
    private readonly entityService: EntityService,
    private readonly blueprintService: BlueprintService,
  ) {}

  @Post('entities')
  async createEntity(
    @Body() dto: CreateEntityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.entityService.create(dto, req.user);
  }

  @Patch('entities/:id')
  async updateEntity(
    @Param('id') id: string,
    @Body() dto: UpdateEntityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.entityService.update(id, dto, req.user);
  }

  @Get('entities')
  async listEntities(@Req() req: AuthenticatedRequest) {
    return this.entityService.list(req.user);
  }

  @Get('entities/workflow/:entityType')
  async getWorkflow(
    @Param('entityType') entityType: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.entityService.getWorkflow(entityType, req.user);
  }

  @Post('entities/sales-execution')
  async executeSales(
    @Body() body: { entityType: string; quantity: number; basePrice: number; branchId?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.entityService.executeSale(body, req.user);
  }

  @Post('blueprints/seed-system')
  seedSystemBlueprints() {
    return this.blueprintService.seedSystemBlueprints();
  }

  @Get('blueprints/system')
  getSystemBlueprints() {
    return {
      seeded: this.blueprintService.isSeeded(),
      blueprints: this.blueprintService.getSystemBlueprints(),
    };
  }
}
