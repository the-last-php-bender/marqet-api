import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { formatResponse } from '../utils/response-formatting.utils';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Wraps every successful response in the standard envelope.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse<Response>();
        const statusCode = response.statusCode || 200;

        let message = 'Request successful';
        if (typeof data === 'string') message = data;
        else if (isRecord(data) && typeof data.message === 'string')
          message = data.message;

        return formatResponse({
          statusCode,
          message,
          data: typeof data !== 'string' ? data : null,
        });
      }),
    );
  }
}
