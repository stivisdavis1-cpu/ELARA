import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller.js';
import { WorkflowService } from './workflow.service.js';
import { IntegrationsModule } from '../integrations/integrations.module.js';
import { DocgenModule } from '../docgen/docgen.module.js';

@Module({
  // Un workflow sait déclencher une validation, un appel webhook et une
  // génération de document : il dépend donc de ces deux modules.
  imports: [IntegrationsModule, DocgenModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
