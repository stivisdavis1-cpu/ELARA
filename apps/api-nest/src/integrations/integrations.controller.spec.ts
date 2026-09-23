import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from './integrations.controller.js';

describe('IntegrationsController', () => {
  let controller: IntegrationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
    }).compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
  });

  it.skip('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
