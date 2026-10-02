import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ScannerService } from './scanner.service.js';

/**
 * Retours du worker IA (FastAPI) transmis par RabbitMQ.
 *
 * Ces écouteurs vivent volontairement hors du contrôleur HTTP. Les gardes et
 * intercepteurs déclarés au niveau d'une classe s'appliquent aussi à ses
 * gestionnaires de messages : le contrôleur exige un en-tête
 * `Authorization` et un `x-tenant-id` qui n'existent pas sur un message, ce qui
 * faisait échouer le traitement et laissait les documents bloqués en cours
 * d'analyse. Un message RabbitMQ est déjà interne et authentifié par le
 * broker : il porte son `tenant_id`, et c'est cette donnée qui fait foi.
 */
@Injectable()
export class ScannerEvents {
  constructor(private readonly scannerService: ScannerService) {}

  @EventPattern('scanner.document.traite')
  async handleDocumentProcessed(@Payload() data: any) {
    await this.scannerService.handleDocumentProcessed(data);
  }

  @EventPattern('scanner.document.progress')
  async handleDocumentProgress(@Payload() data: any) {
    this.scannerService.handleDocumentProgress(
      data.tenant_id,
      data.document_id,
      data.progress,
      data.message,
    );
  }
}
