import { Global, Module } from '@nestjs/common';
import { MinioService } from '../scanner/minio.service.js';

/**
 * Expose le stockage objet (MinIO ou repli `filesystem`) à tous les modules.
 *
 * Le service vivait dans `scanner/`, où il n'était pas exporté : seul le
 * scanner pouvait donc écrire un binaire. La génération de documents doit
 * elle aussi déposer un fichier réel, d'où ce module global.
 */
@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class StorageModule {}
