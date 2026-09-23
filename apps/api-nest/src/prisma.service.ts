import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e: any) {
      console.error('Erreur Prisma connect:', e.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
