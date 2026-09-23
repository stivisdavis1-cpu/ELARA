import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: any = null;
  private channel: any = null;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  private async connect() {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
      this.channel = await this.connection.createChannel();
      
      // Queues
      await this.channel.assertQueue('document_shadow_processing', { durable: true });
      this.logger.log('Connecté à RabbitMQ (amqp://localhost:5672)');
    } catch (error: any) {
      this.logger.error('Erreur de connexion à RabbitMQ. Assurez-vous que le serveur tourne.', error.message);
    }
  }

  async publishDocumentTask(documentId: string, fileUrl: string, mimeType: string, tenantId: string) {
    if (!this.channel) {
      this.logger.warn("RabbitMQ non connecté. Tentative de reconnexion...");
      await this.connect();
      if (!this.channel) throw new Error("Impossible de publier : RabbitMQ indisponible");
    }

    const message = { document_id: documentId, file_url: fileUrl, mime_type: mimeType, tenant_id: tenantId };
    
    this.channel.sendToQueue('document_shadow_processing', Buffer.from(JSON.stringify(message)), { persistent: true });
    this.logger.log(`Tâche OCR asynchrone (Shadow) publiée pour le document ${documentId}`);
  }
}
