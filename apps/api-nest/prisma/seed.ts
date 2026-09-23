import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.upsert({
    where: { id: 'test-tenant' },
    update: {},
    create: {
      id: 'test-tenant',
      raison_sociale: 'Elara Test',
    },
  });
  console.log('Seed: test-tenant créé avec succès');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
