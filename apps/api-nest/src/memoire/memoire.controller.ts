import { Controller, Get, Post, Patch, Param, Body, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { BusinessMemoryService } from './memoire.service.js';

@ApiTags('Mémoire Entreprise')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantInterceptor, AuditInterceptor)
@Controller('v1/memoire')
export class MemoireController {
  constructor(private memoireService: BusinessMemoryService) {}

  // ==========================================
  // CLIENTS
  // ==========================================
  @Get('clients')
  @ApiOperation({ summary: 'Lister les clients' })
  listClients(@Req() req: any) {
    return this.memoireService.listClients(req.user.tenantId);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Créer un client' })
  createClient(@Req() req: any, @Body() data: any) {
    return this.memoireService.createClient(req.user.tenantId, data);
  }

  @Patch('clients/:id')
  @ApiOperation({ summary: 'Mettre à jour un client' })
  updateClient(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.memoireService.updateClient(req.user.tenantId, id, data);
  }

  // ==========================================
  // FOURNISSEURS
  // ==========================================
  @Get('fournisseurs')
  @ApiOperation({ summary: 'Lister les fournisseurs' })
  listFournisseurs(@Req() req: any) {
    return this.memoireService.listFournisseurs(req.user.tenantId);
  }

  @Post('fournisseurs')
  @ApiOperation({ summary: 'Créer un fournisseur' })
  createFournisseur(@Req() req: any, @Body() data: any) {
    return this.memoireService.createFournisseur(req.user.tenantId, data);
  }

  @Patch('fournisseurs/:id')
  @ApiOperation({ summary: 'Mettre à jour un fournisseur' })
  updateFournisseur(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.memoireService.updateFournisseur(req.user.tenantId, id, data);
  }

  // ==========================================
  // PRODUITS
  // ==========================================
  @Get('produits')
  @ApiOperation({ summary: 'Lister les produits' })
  listProduits(@Req() req: any) {
    return this.memoireService.listProduits(req.user.tenantId);
  }

  @Post('produits')
  @ApiOperation({ summary: 'Créer un produit' })
  createProduit(@Req() req: any, @Body() data: any) {
    return this.memoireService.createProduit(req.user.tenantId, data);
  }

  // ==========================================
  // COMMANDES
  // ==========================================
  @Get('commandes')
  @ApiOperation({ summary: 'Lister les commandes' })
  listCommandes(@Req() req: any) {
    return this.memoireService.listCommandes(req.user.tenantId);
  }

  @Post('commandes')
  @ApiOperation({ summary: 'Créer une commande' })
  createCommande(@Req() req: any, @Body() data: any) {
    return this.memoireService.createCommande(req.user.tenantId, data);
  }

  // ==========================================
  // FACTURES
  // ==========================================
  @Get('factures')
  @ApiOperation({ summary: 'Lister les factures' })
  listFactures(@Req() req: any) {
    return this.memoireService.listFactures(req.user.tenantId);
  }

  @Post('factures')
  @ApiOperation({ summary: 'Créer une facture' })
  createFacture(@Req() req: any, @Body() data: any) {
    return this.memoireService.createFacture(req.user.tenantId, data);
  }

  // ==========================================
  // PAIEMENTS
  // ==========================================
  @Get('paiements')
  @ApiOperation({ summary: 'Lister les paiements' })
  listPaiements(@Req() req: any) {
    return this.memoireService.listPaiements(req.user.tenantId);
  }

  @Post('paiements')
  @ApiOperation({ summary: 'Enregistrer un paiement' })
  createPaiement(@Req() req: any, @Body() data: any) {
    return this.memoireService.createPaiement(req.user.tenantId, data);
  }

  // ==========================================
  // DÉPENSES
  // ==========================================
  @Get('depenses')
  @ApiOperation({ summary: 'Lister les dépenses' })
  listDepenses(@Req() req: any) {
    return this.memoireService.listDepenses(req.user.tenantId);
  }

  @Post('depenses')
  @ApiOperation({ summary: 'Créer une dépense' })
  createDepense(@Req() req: any, @Body() data: any) {
    return this.memoireService.createDepense(req.user.tenantId, data);
  }

  // ==========================================
  // STOCKS
  // ==========================================
  @Get('stocks')
  @ApiOperation({ summary: 'Lister les stocks' })
  listStocks(@Req() req: any) {
    return this.memoireService.listStocks(req.user.tenantId);
  }
}
