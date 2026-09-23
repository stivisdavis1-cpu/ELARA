import { Injectable, NestInterceptor, ExecutionContext, CallHandler, StreamableFile, HttpException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  error: string | null;
  meta: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T> | StreamableFile> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T> | StreamableFile> {
    return next.handle().pipe(
      map((data) => {
        // Ne jamais transformer les réponses de streaming binaire (téléchargement GED)
        if (data instanceof StreamableFile) {
          return data;
        }
        // Si le contrôleur a déjà renvoyé une structure { data, meta }, on la respecte
        const isPaginated = data && typeof data === 'object' && 'data' in data && 'meta' in data;
        
        return {
          data: isPaginated ? data.data : data,
          error: null,
          meta: isPaginated ? data.meta : {},
        };
      }),
    );
  }
}
