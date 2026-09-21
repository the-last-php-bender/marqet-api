export interface ResponseFormat {
  statusCode: number;
  message: string;
  data?: unknown;
  error?: string | string[] | null;
}

/**
 * The response envelope shared by the success interceptor and the exception
 * filter.
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
