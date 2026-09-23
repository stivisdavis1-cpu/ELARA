import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { MinioService } from './minio.service.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('MinioService (mode filesystem)', () => {
  let service: MinioService;
  let tempDocDir: string;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    // Chemin temporaire isolé pour chaque test
    tempDocDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elara-docs-'));

    process.env.STORAGE_MODE = 'filesystem';
    process.env.DOCUMENTS_DIR = tempDocDir;

    const module: TestingModule = await Test.createTestingModule({
      providers: [MinioService],
    }).compile();

    service = module.get<MinioService>(MinioService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDocDir, { recursive: true, force: true });
    process.env = { ...originalEnv };
  });

  it('upload retourne une URL local:// et un hash SHA-256', async () => {
    const file = {
      buffer: Buffer.from('facture test'),
      originalname: 'facture.pdf',
      mimetype: 'application/pdf',
      size: 'facture test'.length,
    };

    const result = await service.uploadFile('tenant-1', file);

    expect(result.url).toMatch(/^local:\/\/tenant-1\//);
    expect(result.url).toMatch(/facture\.pdf$/);
    expect(result.hash).toHaveLength(64); // sha256 hex
  });

  it('écrit physiquement le fichier dans le répertoire tenants', async () => {
    const file = {
      buffer: Buffer.from('contenu image jpeg'),
      originalname: 'scan.jpg',
      mimetype: 'image/jpeg',
      size: 18,
    };

    await service.uploadFile('tenant-42', file);

    // Le fichier doit exister sur le disque sous tenant-42/<timestamp>-scan.jpg
    const tenantDir = path.join(tempDocDir, 'tenant-42');
    expect(fs.existsSync(tenantDir)).toBe(true);
    const files = fs.readdirSync(tenantDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/scan\.jpg$/);
    expect(fs.readFileSync(path.join(tenantDir, files[0]))).toEqual(file.buffer);
  });

  it('readBuffer restitue le contenu binaire depuis une URL local://', async () => {
    const file = {
      buffer: Buffer.from('relevé bancaire'),
      originalname: 'releve.pdf',
      mimetype: 'application/pdf',
      size: 15,
    };

    const { url } = await service.uploadFile('tenant-7', file);
    const buffer = await service.readBuffer(url);

    expect(buffer.toString()).toBe('relevé bancaire');
  });

  it('readBuffer lève une erreur si le fichier local est introuvable', async () => {
    await expect(service.readBuffer('local://tenant-9/absent.pdf')).rejects.toThrow(
      /Fichier local introuvable/,
    );
  });

  it('un index.csv est alimenté à chaque upload (traçabilité)', async () => {
    const file = {
      buffer: Buffer.from('devis'),
      originalname: 'devis.docx',
      mimetype: 'application/octet-stream',
      size: 5,
    };

    await service.uploadFile('tenant-3', file);

    const indexPath = path.join(tempDocDir, 'index.csv');
    expect(fs.existsSync(indexPath)).toBe(true);
    expect(fs.readFileSync(indexPath, 'utf-8')).toContain('tenant-3/');
    expect(fs.readFileSync(indexPath, 'utf-8')).toContain('devis.docx');
  });
});