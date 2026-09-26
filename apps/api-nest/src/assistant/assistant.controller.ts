import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { AssistantService } from './assistant.service.js';
import { SearchService } from '../scanner/search.service.js';

@ApiTags('Assistant IA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/assistant')
export class AssistantController {

  constructor(
    private readonly assistantService: AssistantService,
    private readonly searchService: SearchService,
  ) {}

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

  @Post('feedback')
  @ApiOperation({ summary: 'Noter une réponse de l\'assistant (1 utile, -1 inutile)' })
  @ApiBody({
    schema: {
      example: {
        message_id: 'uuid-du-message',
        question: 'Quel est mon résultat net ?',
        note: 1,
        commentaire: 'Le chiffre correspond au bilan.',
      },
    },
  })
  async feedback(@Req() req: any, @Body() data: { message_id?: string; question?: string; note: number; commentaire?: string; reponse?: unknown }) {
    return this.assistantService.enregistrerFeedback(req.user.tenantId, data);
  }

  @Get('recherche')
  @ApiOperation({
    summary: 'Recherche documentaire hybride avec citations (plein texte + vectorielle, fusion RRF)',
  })
  async rechercher(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('archives') archives?: string,
  ) {
    if (!q) return { query: '', passages: [], suffisant: false, avertissements: ['Requête q manquante.'] };
    return this.searchService.rechercher(req.user.tenantId, q, {
      limit: limit ? Number(limit) : undefined,
      types: type ? type.split(',').filter(Boolean) : undefined,
      archives: archives === 'true' ? true : archives === 'false' ? false : undefined,
    });
  }
}
