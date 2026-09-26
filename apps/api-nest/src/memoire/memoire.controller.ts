import { Body, Controller, Get, Post, Patch, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { TenantInterceptor } from '../tenant/tenant.interceptor.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { TenantId } from '../tenant/tenant-id.decorator.js';
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
  listClients(@TenantId() tenantId: string) {
    return this.memoireService.listClients(tenantId);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Créer un client' })
  createClient(@TenantId() tenantId: string, @Body() data: any) {
    return this.memoireService.createClient(tenantId, data);
  }

  @Patch('clients/:id')
  @ApiOperation({ summary: 'Mettre à jour un client' })
  updateClient(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.memoireService.updateClient(tenantId, id, data);
  }

  // ==========================================
  // FOURNISSEURS
  // ==========================================
  @Get('fournisseurs')
  @ApiOperation({ summary: 'Lister les fournisseurs' })
  listFournisseurs(@TenantId() tenantId: string) {
    return this.memoireService.listFournisseurs(tenantId);
  }

  @Post('fournisseurs')
  @ApiOperation({ summary: 'Créer un fournisseur' })
  createFournisseur(@TenantId() tenantId: string, @Body() data: any) {
    return this.memoireService.createFournisseur(tenantId, data);
  }

  @Patch('fournisseurs/:id')
  @ApiOperation({ summary: 'Mettre à jour un fournisseur' })
  updateFournisseur(@TenantId() tenantId: string, @Param('id') id: string, @Body() data: any) {
    return this.memoireService.updateFournisseur(tenantId, id, data);
  }

  // ==========================================
  // PRODUITS
  // ==========================================
  @Get('produits')
  @ApiOperation({ summary: 'Lister les produits' })
  listProduits(@TenantId() tenantId: string) {
    return this.memoireService.listProduits(tenantId);
  }

  @Post('produits')
  @ApiOperation({ summary: 'Créer un produit' })
  createProduit(@TenantId() tenantId: string, @Body() data: any) {
    return this.memoireService.createProduit(tenantId, data);
  }

  // ==========================================
  // COMMANDES
  // ==========================================
  @Get('commandes')
  @ApiOperation({ summary: 'Lister les commandes' })
  listCommandes(@TenantId() tenantId: string) {
    return this.memoireService.listCommandes(tenantId);
  }

  @Post('commandes')
  @ApiOperation({ summary: 'Créer une commande' })
  createCommande(@TenantId() tenantId: string, @Body() data: any) {
    return this.memoireService.createCommande(tenantId, data);
  }

  // ==========================================
  // FACTURES
  // ==========================================
  @Get('factures')
  @ApiOperation({ summary: 'Lister les factures' })
  listFactures(@TenantId() tenantId: string) {
    return this.memoireService.listFactures(tenantId);
  }

  @Post('factures')
  @ApiOperation({ summary: 'Créer une facture' })
  createFacture(@TenantId() tenantId: string, @Body() data: any) {
    return this.memoireService.createFacture(tenantId, data);
  }

  // ==========================================
  // PAIEMENTS
  // ==========================================
  @Get('paiements')
  @ApiOperation({ summary: 'Lister les paiements' })
  listPaiements(@TenantId() tenantId: string) {
    return this.memoireService.listPaiements(tenantId);
  }

  @Post('paiements')
  @ApiOperation({ summary: 'Enregistrer un paiement' })
  createPaiement(@TenantId() tenantId: string, @Body() data: any) {
    return this.memoireService.createPaiement(tenantId, data);
  }

  // ==========================================
  // DÉPENSES
  // ==========================================
  @Get('depenses')
  @ApiOperation({ summary: 'Lister les dépenses' })
  listDepenses(@TenantId() tenantId: string) {
    return this.memoireService.listDepenses(tenantId);
  }

  @Post('depenses')
  @ApiOperation({ summary: 'Créer une dépense' })
  createDepense(@TenantId() tenantId: string, @Body() data: any) {
    return this.memoireService.createDepense(tenantId, data);
  }

  // ==========================================
  // STOCKS
  // ==========================================
  @Get('stocks')
  @ApiOperation({ summary: 'Lister les stocks' })
  listStocks(@TenantId() tenantId: string) {
    return this.memoireService.listStocks(tenantId);
  }
}
