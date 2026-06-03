import { Test, TestingModule } from '@nestjs/testing';
import { DiningTableService } from './dining-table.service';

describe('DiningTableService', () => {
  let service: DiningTableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiningTableService],
    }).compile();

    service = module.get<DiningTableService>(DiningTableService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
