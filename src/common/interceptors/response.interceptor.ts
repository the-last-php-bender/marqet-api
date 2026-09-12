import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { formatResponse } from '../utils/response-formatting.utils';

/**
 * Wraps every successful response in the standard envelope.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(
			map((data) => {
				const ctx = context.switchToHttp();
				const response = ctx.getResponse();
				const statusCode = response.statusCode || 200;
				const message = typeof data === 'string' ? data : data?.message || 'Request successful';

				return formatResponse({
					statusCode,
					message,
					data: typeof data !== 'string' ? data : null,
				});
			}),
		);
	}
}
