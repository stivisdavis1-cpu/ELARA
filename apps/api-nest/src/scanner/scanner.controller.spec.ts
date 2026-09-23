import { Test, TestingModule } from '@nestjs/testing';
import { ScannerController } from './scanner.controller.js';

import { PassportModule } from '@nestjs/passport';

describe('ScannerController', () => {
  let controller: ScannerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ScannerController],
    }).compile();

    controller = module.get<ScannerController>(ScannerController);
  });

  it.skip('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
