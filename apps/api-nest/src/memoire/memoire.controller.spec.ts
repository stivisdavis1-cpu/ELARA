import { Test, TestingModule } from '@nestjs/testing';
import { MemoireController } from './memoire.controller.js';

describe('MemoireController', () => {
  let controller: MemoireController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoireController],
    }).compile();

    controller = module.get<MemoireController>(MemoireController);
  });

  it.skip('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
