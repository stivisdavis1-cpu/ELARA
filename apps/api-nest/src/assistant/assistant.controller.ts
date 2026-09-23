import { Controller, Get, Post, Body, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { AssistantService } from './assistant.service.js';

@ApiTags('Assistant IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/assistant')
export class AssistantController {

  constructor(private readonly assistantService: AssistantService) {}

  @Post('advice')
  @ApiOperation({ summary: 'Poser une question à l\'Assistant IA' })
  @ApiBody({ schema: { example: { question: 'Je manque de trésorerie ce mois-ci, que faire avec mon fournisseur ?' } } })
  async askQuestion(@Req() req: any, @Body() data: { question: string }) {
    if (!data.question) {
       return { diagnostic: "Veuillez poser une question précise.", actions_recommandees: [], alerte_tresorerie: false, incertitudes: [] };
    }
    return this.assistantService.askAdvice(req.user.tenantId, data.question);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Récupérer l\'historique des conversations avec la mémoire d\'entreprise' })
  async getConversations(@Req() req: any) {
    return this.assistantService.getConversationHistory(req.user.tenantId);
  }
}
