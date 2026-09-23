import { Test, TestingModule } from '@nestjs/testing';
import { AssistantController } from './assistant.controller.js';

describe('AssistantController', () => {
  let controller: AssistantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistantController],
    }).compile();

    controller = module.get<AssistantController>(AssistantController);
  });

  it.skip('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
