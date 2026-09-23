import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class TaxAgentService {
  private readonly logger = new Logger(TaxAgentService.name);
  private readonly aiUrl = process.env.API_AI_INTERNAL_URL || 'http://localhost:8000';

  constructor(private readonly prisma: PrismaService) {}

  private async getRules(tenantId: string) {
    try {
      const rules = await this.prisma.taxRule.findMany({
        where: { tenant_id: tenantId }
      });
      const rulesMap: any = {};
      rules.forEach((r: any) => {
        rulesMap[r.pays] = {
          pays_code_iso: r.pays,
          tva: { taux_standard: Number(r.taux_standard_tva) },
          cotisations_sociales: r.cotisations_sociales,
          date_verification: r.date_verification,
          source: r.source
        };
      });
      return rulesMap;
    } catch (e) {
      this.logger.error("Erreur lecture Prisma TaxRule", e);
      return {};
    }
  }

  private async saveRules(tenantId: string, rules: any) {
    try {
      for (const [country, data] of Object.entries<any>(rules)) {
        if (!data.tva?.taux_standard) continue;
        await this.prisma.taxRule.upsert({
          where: {
            tenant_id_pays: {
              tenant_id: tenantId,
              pays: country
            }
          },
          update: {
            taux_standard_tva: data.tva.taux_standard,
            cotisations_sociales: data.cotisations_sociales || {},
            date_verification: data.tva.date_verification ? new Date(data.tva.date_verification) : new Date(),
            source: data.tva.source_url || null
          },
          create: {
            tenant_id: tenantId,
            pays: country,
            taux_standard_tva: data.tva.taux_standard,
            cotisations_sociales: data.cotisations_sociales || {},
            date_verification: data.tva.date_verification ? new Date(data.tva.date_verification) : new Date(),
            source: data.tva.source_url || null
          }
        });
      }
    } catch (e) {
      this.logger.error("Erreur sauvegarde Prisma TaxRule", e);
    }
  }

  private isUpdateNeeded(countryCode: string, rules: any): boolean {
    if (!rules[countryCode]) return true;
    const rule = rules[countryCode];
    if (!rule.date_verification) return true;

    const lastVerif = new Date(rule.date_verification);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return lastVerif < sixMonthsAgo;
  }

  async runAgent(tenantId: string, targetCountries: string[]) {
    this.logger.log(`Démarrage de l'agent fiscal pour : ${targetCountries.join(', ')}`);
    const currentRules = await this.getRules(tenantId);
    
    const result = {
      pays_traites: [] as string[],
      mises_a_jour: [] as any[],
      a_verifier_manuellement: [] as any[],
      non_disponibles: [] as any[]
    };

    // Identifier les pays qui nécessitent une mise à jour
    const countriesToUpdate = targetCountries.filter(country => this.isUpdateNeeded(country, currentRules));

    if (countriesToUpdate.length > 0) {
      this.logger.log(`Analyse nécessaire pour : ${countriesToUpdate.join(', ')}. Appel du microservice IA...`);
      result.pays_traites = countriesToUpdate;

      try {
        const response = await fetch(this.aiUrl + '/ai/tax-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pays: countriesToUpdate,
            tenant_id: tenantId
          })
        });

        if (response.ok) {
          const aiData = await response.json();
          if (aiData.rules && Array.isArray(aiData.rules)) {
            for (const rule of aiData.rules) {
              const countryCode = rule.pays;
              const formattedRule = {
                pays_code_iso: countryCode,
                tva: { 
                  taux_standard: rule.taux_tva_standard, 
                  date_verification: new Date().toISOString(),
                  source_url: rule.description || "LLM"
                },
                cotisations_sociales: {}
              };
              currentRules[countryCode] = formattedRule;
              result.mises_a_jour.push(formattedRule);
            }
          }
        } else {
            this.logger.error(`Erreur API FastAPI Tax Rules: ${response.statusText}`);
        }
      } catch (e: any) {
        this.logger.error(`Erreur appel LLM Tax Agent: ${e.message}`);
      }
    }

    // Sauvegarde en base PostgreSQL via Prisma
    if (result.mises_a_jour.length > 0) {
      await this.saveRules(tenantId, currentRules);
    }

    return result;
  }
}
