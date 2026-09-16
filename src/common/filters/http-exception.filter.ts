import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  formatResponse,
  ResponseFormat,
} from '../utils/response-formatting.utils';

/**
 * Renders every thrown HttpException in the standard envelope:
 * { statusCode, message, data: null, error }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    const payload: ResponseFormat = {
      statusCode: status,
      message: exception.message || 'An error occurred.',
    };

    if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const messages = (exceptionResponse as Record<string, unknown>)[
          'message'
        ];
        if (Array.isArray(messages)) {
          payload.message = messages[0];
          payload.error = messages;
        } else if (typeof messages === 'string') {
          payload.message = messages;
          payload.error = [messages];
        }
      }
    }

    response.status(status).json(formatResponse(payload));
  }
}

/**
 * Catches everything that is not an HttpException (unexpected errors),
 * hides internals from clients and still returns the standard envelope.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      formatResponse({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error.',
      }),
    );
  }
}
