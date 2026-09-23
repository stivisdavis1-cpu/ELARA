import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // Filtres et Intercepteurs globaux
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new AuditInterceptor());

  // Validation globale avec class-validator
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Configuration Swagger (OpenAPI)
  const config = new DocumentBuilder()
    .setTitle('API Interne ELARA')
    .setDescription('Couche d\'API interne pour le backend métier NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

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
