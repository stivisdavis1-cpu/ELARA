import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001';
const tenantId = 'test-tenant';

// Mock token (in a real test we'd get a token or use the test tenant override)
const headers = {
  'Content-Type': 'application/json',
  'x-tenant-id': tenantId,
  'Authorization': 'Bearer test-token'
};

async function runTest() {
  console.log('--- DÉMARRAGE DU TEST E2E INVOICENOW ---');
  
  console.log('\n[1/5] Nettoyage de la base de données pour test-tenant...');
  await prisma.message.deleteMany({ where: { conversation: { tenant_id: tenantId } } });
  await prisma.conversation.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.companyMemory.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.depense.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.paiement.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.facture.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.document.deleteMany({ where: { tenant_id: tenantId } });
  await prisma.fournisseur.deleteMany({ where: { tenant_id: tenantId } });

  console.log('\n[2/5] Création de l\'historique normal (Moyenne Facture TECH_CORP = 50 000 FCFA)...');
  const docHistory = await prisma.document.create({
    data: {
      id: 'doc-hist-1',
      tenant_id: tenantId,
      type_document: 'facture',
      statut_validation: 'valide_automatiquement',
      score_confiance: 0.95,
      niveau_risque: 0,
      lien_minio: 'http://minio/bucket/hist.pdf'
    }
  });

  const fournisseur = await prisma.fournisseur.create({
    data: {
      id: 'fournisseur-1',
      tenant_id: tenantId,
      nom: 'TECH_CORP_MOCK',
    }
  });

  await prisma.facture.create({
    data: {
      tenant_id: tenantId,
      document_id: docHistory.id,
      fournisseur_id: fournisseur.id,
      numero: 'INV-001',
      montant_total: 50000,
      statut: 'payee'
    }
  });

  console.log('\n[3/5] Simulation Scanner IA (Facture suspecte à 5 000 000 FCFA)...');
  const docSuspectId = 'doc-suspect-1';
  await prisma.document.create({
    data: {
      id: docSuspectId,
      tenant_id: tenantId,
      type_document: 'Inconnu',
      statut_validation: 'en_cours',
      score_confiance: 0,
      niveau_risque: 0,
      lien_minio: 'http://minio/bucket/susp.pdf'
    }
  });

  // On simule ce que ferait l'IA en injectant directement le payload traité.
  // Normalement l'API Nest expose une route pour ça si on n'a pas RabbitMQ.
  // On va utiliser le PrismaClient pour faire ce que handleDocumentProcessed fait :
  
  console.log("-> Injection de la facture frauduleuse en BDD...");
  await prisma.facture.create({
      data: {
          tenant_id: tenantId,
          document_id: docSuspectId,
          fournisseur_id: fournisseur.id,
          numero: 'INV-999',
          montant_total: 5000000, // 100x la moyenne
          statut: 'brouillon'
      }
  });

  await prisma.document.update({
      where: { id: docSuspectId },
      data: {
          statut_validation: 'a_auditer',
          niveau_risque: 10, // Anomalie majeure
          type_document: 'facture',
          score_confiance: 0.9,
          // On enregistre l'anomalie dans le document lui-même pour l'historique
      }
  });

  // Ajout en Company Memory
  await prisma.companyMemory.create({
      data: {
          tenant_id: tenantId,
          content: `Nouvelle facture de TECH_CORP_MOCK reçue. Montant: 5000000 FCFA. Attention, montant suspect.`,
          type_info: 'historique'
      }
  });

  console.log('\n[4/5] Vérification API Dashboard CFO (Shadow Alerts & BFR)...');
  const anomaliesRes = await fetch(`${API_URL}/v1/cfo/risques/anomalies`, { headers });
  const anomalies = await anomaliesRes.json();
  if (anomalies && anomalies.length > 0) {
      console.log('✅ SUCCÈS: Anomalie remontée par l\'API !');
      console.log('Détails:', anomalies[0].message);
  } else {
      console.error('❌ ÉCHEC: Anomalie non détectée par l\'API.', anomalies);
  }

  const bfrRes = await fetch(`${API_URL}/v1/cfo/cashflow/bfr`, { headers });
  const bfr = await bfrRes.json();
  console.log('BFR Actuel remonté par l\'API:', bfr.bfr);

  console.log('\n[5/5] Vérification API Conseiller IA (Company Memory)...');
  const adviceRes = await fetch(`${API_URL}/v1/assistant/advice`, { 
      method: 'POST',
      headers,
      body: JSON.stringify({ 
          query: 'Que penses-tu de la facture de TECH_CORP_MOCK ?',
          context: { role: 'cfo' }
      })
  });
  const advice = await adviceRes.json();
  if (advice.memoire_entreprise_utilisee) {
      console.log('✅ SUCCÈS: L\'IA a utilisé la mémoire d\'entreprise !');
      console.log('Diagnostic IA:', advice.diagnostic);
  } else {
      console.log('Diagnostic IA:', advice.diagnostic);
      console.error('❌ ÉCHEC: L\'IA n\'a pas renvoyé le flag mémoire utilisée, ou le serveur python n\'est pas dispo.');
  }

  console.log('\n--- FIN DU TEST E2E ---');
  await prisma.$disconnect();
}

runTest().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
});
