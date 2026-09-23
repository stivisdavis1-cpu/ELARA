import { Test, TestingModule } from '@nestjs/testing';
import { RapportController } from './rapport.controller.js';

describe('RapportController', () => {
  let controller: RapportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RapportController],
    }).compile();

    controller = module.get<RapportController>(RapportController);
  });

  it.skip('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
