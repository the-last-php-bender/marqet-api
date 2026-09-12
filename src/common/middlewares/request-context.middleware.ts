import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';
export const REQUEST_ID_KEY = 'requestId';

/**
 * Attaches a correlation id to every request before routing/guards run and
 * logs one structured line per request. The id is echoed back in the
 * `x-request-id` response header so clients can quote it in bug reports.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
	private readonly logger = new Logger('HTTP');

	use(req: Request & { [REQUEST_ID_KEY]?: string }, res: Response, next: NextFunction): void {
		const requestId = randomUUID();
		req[REQUEST_ID_KEY] = requestId;
		res.setHeader(REQUEST_ID_HEADER, requestId);

		const start = process.hrtime.bigint();

		res.on('finish', () => {
			const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
			this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms [${requestId}]`);
		});

		next();
	}
}
