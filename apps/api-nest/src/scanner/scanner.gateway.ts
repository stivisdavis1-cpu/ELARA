import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/v1/scanner/realtime',
})
export class ScannerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScannerGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté : ${client.id}`);
    const tenantId = client.handshake.query.tenantId as string;
    if (tenantId) {
      client.join(tenantId);
      this.logger.log(`Client ${client.id} a rejoint la room tenant : ${tenantId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté : ${client.id}`);
  }

  notifyDocumentStatus(tenantId: string, documentId: string, status: string, metadata: any = {}) {
    this.server.to(tenantId).emit('document_status_update', {
      documentId,
      status,
      ...metadata,
    });
    this.logger.log(`Notification envoyée pour le document ${documentId} (statut: ${status})`);
  }

  notifyDocumentProgress(tenantId: string, documentId: string, progress: number, message: string) {
    this.server.to(tenantId).emit('document_progress_update', {
      documentId,
      progress,
      message
    });
  }
}
