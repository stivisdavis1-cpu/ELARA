import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    console.error('[AllExceptionsFilter]', exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // ERREURS 500 MASQUÉES : le détail (stack, requête SQL, chemins disque)
    // part au log serveur UNIQUEMENT. Le client reçoit un identifiant de
    // corrélation pour le support, jamais le contenu de l'exception.
    if (!(exception instanceof HttpException)) {
      const ref = `ERR-${Date.now().toString(36).toUpperCase()}`;
      console.error(`[AllExceptionsFilter] ${ref}`, exception);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        data: null,
        error: 'Erreur interne. Référence : ' + ref,
        meta: {
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      });
      return;
    }

    const message = exception.getResponse();

    const errorMessage = typeof message === 'string' ? message : (message as any).message || message;

    response.status(status).json({
      data: null,
      error: errorMessage,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
