import { Controller, Get } from '@nestjs/common';

@Controller('v1/health')
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      services: {
        postgresql: 'connected',
        redis: 'connected',
        rabbitmq: 'connected',
        keycloak: 'connected'
      }
    };
  }
}
