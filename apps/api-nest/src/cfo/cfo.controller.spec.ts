import { Test, TestingModule } from '@nestjs/testing';
import { CfoController } from './cfo.controller.js';

describe('CfoController', () => {
  let controller: CfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CfoController],
    }).compile();

    controller = module.get<CfoController>(CfoController);
  });

  it.skip('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
