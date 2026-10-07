import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createRequire } from 'node:module';
const requireNode = createRequire(import.meta.url);
// timingSafeEqual sans import statique de node:crypto en tête (main.ts reste
// lisible) ; nom explicite, pas de collision possible.
const { timingSafeEqual: timingSafeEqualFetch } = requireNode('node:crypto') as typeof import('node:crypto');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS FERMÉ : l'API n'est joignable que par le front Next.js (rewrites
  // même origine) et, en dev, par localhost. Aucune origine tierce, même
  // en développement : le navigateur n'a rien à demander ailleurs.
  const originesAutorisees = [
    process.env.PUBLIC_WEB_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.WEB_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter((o): o is string => typeof o === 'string' && o.length > 0);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Requêtes non-navigateur (curl, healthchecks, microservices) : pas d'Origin.
      if (!origin) return callback(null, true);
      if (originesAutorisees.includes(origin)) return callback(null, true);
      return callback(new Error(`Origine CORS refusée : ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 600,
  });

  // Fuite d'empreinte : Express annonce sa version par défaut.
  const serveur = app.getHttpAdapter().getInstance();
  serveur?.disable?.('x-powered-by');

  // Taille maximale des corps : sans limite, un JSON de 500 Mo sature la RAM
  // du worker (DoS par épuisement). 1 Mo suffit aux DTO métier ; les fichiers
  // passent par Multer, pas par le JSON.
  serveur?.use?.(json({ limit: '1mb' }));
  serveur?.use?.(urlencoded({ extended: true, limit: '1mb' }));

  // En-têtes de durcissement (helmet refusé : dépendance supplémentaire pour
  // 6 en-têtes statiques ; posés à la main, testés par security.spec.ts).
  app.use((req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    );
    // HSTS uniquement derrière TLS : en clair il figerait localhost en HTTPS.
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Filtres et Intercepteurs globaux
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Validation globale avec class-validator
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger : JAMAIS en production. Hors prod, protégé par un jeton simple
  // (DOCS_TOKEN) pour ne pas cartographier l'API au premier venu. Le
  // middleware DOIT être posé AVANT SwaggerModule.setup (ordre Express).
  const docsJeton = process.env.DOCS_TOKEN;
  if (process.env.NODE_ENV !== 'production') {
    if (docsJeton) {
      app.use('/docs', (req: any, res: any, next: () => void) => {
        const fourni =
          req.headers['x-docs-token'] ??
          (typeof req.query.token === 'string' ? req.query.token : undefined);
        // Comparaison constante : la longueur du secret ne doit pas fuiter
        // via le temps de réponse (timing attack sur ===).
        const attendu = Buffer.from(docsJeton);
        const recu = Buffer.from(String(fourni ?? ''));
        const ok = recu.length === attendu.length && timingSafeEqualFetch(recu, attendu);
        if (!ok) {
          // 404 volontaire, pas 401 : on ne révèle même pas l'existence de la doc.
          res.status(404).json({ data: null, error: 'Non trouvé' });
          return;
        }
        next();
      });
    }
    const config = new DocumentBuilder()
    .setTitle('API Interne ELARA')
    .setDescription('Couche d\'API interne pour le backend métier NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { customSiteTitle: 'ELARA API' });
  } // fin Swagger hors-production

  // Configuration Microservice RabbitMQ
  const microserviceOptions: MicroserviceOptions = {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'scanner.document.traite',
      queueOptions: {
        durable: true,
      },
    },
  };
  app.connectMicroservice(microserviceOptions);
  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
