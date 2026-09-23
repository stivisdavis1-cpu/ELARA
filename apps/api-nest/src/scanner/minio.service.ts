import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type StorageMode = 'filesystem' | 'minio' | 'auto';

/**
 * Service de stockage des documents ELARA.
 *
 * Deux modes sont supportés, pilotés par la variable d'environnement
 * `STORAGE_MODE` (défaut : `auto`) :
 *
 *  - `filesystem` : les documents sont écrits dans un répertoire local
 *    (`DOCUMENTS_DIR`, défaut `./local-ged`) organisé par tenant. Aucune
 *    dépendance à MinIO. Les fichiers sont adressés via une URL `local://`.
 *    Ce mode est idéal pour le local et l'On-Premise : cela allège la base
 *    de données (aucun blob) et fonctionne identiquement sous Docker dès lors
 *    que le répertoire est monté en volume partagé entre api-nest et api-ai.
 *
 *  - `minio` : stockage objet S3 compatible MinIO (cloud / multi-réplicas).
 *    Corrige le bug connu du client `minio` (« S3Error: The AWS Access Key Id
 *    you provided does not exist in our records ») : l'endpoint est désormais
 *    dérivé d'une URL complète `MINIO_ENDPOINT_URL` (hôte + port + SSL
 *    correctement propagés au constructeur de signature v4).
 *
 *  - `auto` (défaut) : tente MinIO en premier, bascule en `filesystem` si
 *    le service objet est indisponible — les URLs restent préfixées
 *    `local://` dans ce cas.
 */
@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private readonly storageMode: StorageMode =
    (process.env.STORAGE_MODE as StorageMode) || 'auto';
  private readonly bucketName = process.env.MINIO_BUCKET_NAME || 'elara-documents';
  private readonly documentsDir = path.resolve(
    process.env.DOCUMENTS_DIR || path.join(process.cwd(), 'local-ged'),
  );
  private readonly archiveDir = path.resolve(
    process.env.ARCHIVE_DIR || path.join(process.cwd(), 'local-archive'),
  );
  private readonly minioClient: Minio.Client;
  private readonly minioUrlBase: string;

  constructor() {
    const { endPoint, port, useSSL } = this.parseEndpoint(process.env.MINIO_ENDPOINT_URL);

    this.minioClient = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      region: process.env.MINIO_REGION || 'us-east-1',
    });
    this.minioUrlBase = `${useSSL ? 'https' : 'http'}://${endPoint}:${port}/${this.bucketName}`;

    if (!fs.existsSync(this.documentsDir)) {
      fs.mkdirSync(this.documentsDir, { recursive: true });
      this.logger.log(`Répertoire documents local prêt : ${this.documentsDir}`);
    }

    if (this.storageMode !== 'filesystem') {
      this.initializeBucket();
    }

    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
      this.logger.log(`Diskgroup d'archives sécurisé prêt : ${this.archiveDir}`);
    }
  }

  get mode(): StorageMode {
    return this.storageMode;
  }

  private parseEndpoint(url?: string): { endPoint: string; port: number; useSSL: boolean } {
    if (url) {
      try {
        const parsed = new URL(url);
        return {
          endPoint: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80,
          useSSL: parsed.protocol === 'https:',
        };
      } catch {
        this.logger.warn(`MINIO_ENDPOINT_URL invalide (${url}), fallback sur les variables MINIO_ENDPOINT.*`);
      }
    }
    return {
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
    };
  }

  private async initializeBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, this.minioClient.region || 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} créé avec succès.`);
      }
    } catch (error: any) {
      this.logger.warn(`MinIO indisponible (${error?.code || error?.message || error}) — fallback stockage local activé.`);
    }
  }

  async uploadFile(tenantId: string, file: any): Promise<{ url: string; hash: string }> {
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const safeName = file.originalname?.replace(/[\\/:*?"<>|]/g, '_') || 'document';
    const objectName = `${tenantId}/${Date.now()}-${safeName}`;

    if (this.storageMode === 'filesystem') {
      return this.uploadLocal(objectName, file, hash);
    }

    try {
      await this.minioClient.putObject(this.bucketName, objectName, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });
      return { url: `${this.minioUrlBase}/${objectName}`, hash };
    } catch (error: any) {
      if (this.storageMode === 'minio') {
        throw error;
      }
      this.logger.warn(`Upload MinIO échoué (${error?.code || error?.message}), repli local GitHub-grade.`);
      return this.uploadLocal(objectName, file, hash);
    }
  }

  private uploadLocal(objectName: string, file: any, hash: string): { url: string; hash: string } {
    const absPath = path.join(this.documentsDir, objectName);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, file.buffer);
    const url = `local://${objectName}`;
    fs.appendFileSync(
      path.join(this.documentsDir, 'index.csv'),
      `${objectName},${file.mimetype || ''},${Date.now()}\n`,
    );
    this.logger.log(`Document stocké localement (${this.storageMode === 'filesystem' ? 'mode filesystem' : 'fallback'}) : ${url}`);
    return { url, hash };
  }

  /** Lecture du contenu binaire d'un document à partir de son URL (filesystem OU MinIO). */
  async readBuffer(fileUrl: string): Promise<Buffer> {
    if (fileUrl.startsWith('archive://')) {
      const objectName = fileUrl.slice('archive://'.length);
      const absPath = this.safeJoin(this.archiveDir, objectName);
      if (!fs.existsSync(absPath)) {
        throw new Error(`Archive introuvable : ${absPath}`);
      }
      return fs.readFileSync(absPath);
    }

    if (fileUrl.startsWith('local://')) {
      const objectName = fileUrl.slice('local://'.length);
      const absPath = this.safeJoin(this.documentsDir, objectName);
      if (!fs.existsSync(absPath)) {
        throw new Error(`Fichier local introuvable : ${absPath}`);
      }
      return fs.readFileSync(absPath);
    }

    const marker = `/${this.bucketName}/`;
    const objectName = fileUrl.includes(marker) ? fileUrl.split(marker)[1] : fileUrl;
    const stream = await this.minioClient.getObject(this.bucketName, objectName);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Archival physique sécurisé (« diskgroup ») : copie immuable, isolée par tenant,
   * classée par mois. Le fichier source reste en zone de travail ; l'archive est
   * adressée via une URL logique `archive://tenant/YYYY-MM/<docId>.<ext>`.
   * Aucune exposition statique : la lecture passe uniquement par les endpoints
   * authentifiés. L'index physique est tracé dans archive-index.csv.
   */
  async archiveBytes(
    tenantId: string,
    docId: string,
    sourceUrl: string,
    buffer: Buffer,
  ): Promise<{ archiveUrl: string; size: number; checksum: string }> {
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const safeTenant = tenantId.replace(/[\\/:*?"<>|]/g, '_');
    const objectName = `${safeTenant}/${month}/${docId}${this.extensionOf(sourceUrl)}`;
    const absPath = this.safeJoin(this.archiveDir, objectName);

    fs.mkdirSync(path.dirname(absPath), { recursive: true });

    if (!fs.existsSync(absPath)) {
      fs.writeFileSync(absPath, buffer);
      this.logger.log(`Document archivé (diskgroup sécurisé) : archive://${objectName}`);
    } else {
      this.logger.log(`Archive déjà présente, réutilisée : archive://${objectName}`);
    }

    fs.appendFileSync(
      path.join(this.archiveDir, 'archive-index.csv'),
      `${objectName},${checksum},${buffer.length},${Date.now()}\n`,
    );
    return { archiveUrl: `archive://${objectName}`, size: buffer.length, checksum };
  }

  /** Jointure sécurisée : garantit que le résultat reste sous le répertoire racine. */
  private safeJoin(rootDir: string, objectName: string): string {
    const absRoot = path.resolve(rootDir);
    const absTarget = path.resolve(absRoot, objectName);
    if (absTarget !== absRoot && !absTarget.startsWith(absRoot + path.sep)) {
      throw new Error(`Chemin d'accès invalide hors du répertoire autorisé : ${objectName}`);
    }
    return absTarget;
  }

  private extensionOf(url: string): string {
    const clean = (url || '').split('?')[0].split('#')[0];
    const match = /\.[a-zA-Z0-9]{1,8}$/.exec(clean);
    return match ? match[0].toLowerCase() : '';
  }
}