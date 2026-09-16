export interface ResponseFormat {
  statusCode: number;
  message: string;
  data?: unknown;
  error?: string | string[] | null;
}

/**
 * The one and only response envelope used by both the success interceptor
 * and the exception filter — change the shape here and it changes everywhere.
 */
export function formatResponse({
  statusCode,
  message,
  data = null,
  error = null,
}: ResponseFormat): Record<string, unknown> {
  return {
    statusCode,
    message,
    data,
    error,
  };
}
