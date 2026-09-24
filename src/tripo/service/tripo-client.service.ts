import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

interface TripoTaskResponse {
  code: number;
  message?: string;
  data: {
    task_id: string;
    status?: string;
    progress?: number;
    error_msg?: string;
    output?: {
      pbr_model?: string;
      model?: string;
    };
  };
}

const TRIPO_STATUS_SUCCESS = 'success';
const TERMINAL_FAILURE_STATUSES = new Set([
  'failed',
  'cancelled',
  'banned',
  'expired',
]);

/**
 * Tripo AI adapter — owns the API auth header, payload shapes and status polling.
 */
@Injectable()
export class TripoClientService {
  private readonly logger = new Logger(TripoClientService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly pollIntervalMs: number;
  private readonly pollTimeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.baseUrl = configService
      .getOrThrow<string>('TRIPO_API_BASE_URL')
      .replace(/\/+$/, '');
    this.apiKey = configService.getOrThrow<string>('TRIPO_API_KEY');
    this.pollIntervalMs =
      configService.get<number>('TRIPO_POLL_INTERVAL_MS') ?? 5000;
    this.pollTimeoutMs =
      configService.get<number>('TRIPO_POLL_TIMEOUT_MS') ?? 900_000;
  }

  /**
   * Creates a `multiview_to_model` task; `imageUrls` must be ordered
   * FRONT, LEFT, BACK, RIGHT as Tripo's schema expects.
   */
  async createMultiviewTask(imageUrls: string[]): Promise<string> {
    try {
      const files = imageUrls.map((url) => ({
        type: url.toLowerCase().endsWith('.png') ? 'png' : 'jpg',
        url,
      }));
      const response = await firstValueFrom(
        this.httpService.post<TripoTaskResponse>(
          `${this.baseUrl}/task`,
          { type: 'multiview_to_model', files },
          { headers: this.authHeaders(), timeout: 30_000 },
        ),
      );
      this.assertTripoOk(response.data);
      return response.data.data.task_id;
    } catch (error) {
      throw this.toUnprocessable('Creating the Tripo task failed.', error);
    }
  }

  /** Polls until success/failure or timeout. Returns the generated model URL. */
  async waitForModel(taskId: string): Promise<string> {
    const deadline = Date.now() + this.pollTimeoutMs;

    while (Date.now() < deadline) {
      const status = await this.fetchTask(taskId);

      if (status.status === TRIPO_STATUS_SUCCESS) {
        const modelUrl = status.output?.pbr_model ?? status.output?.model;
        if (!modelUrl)
          throw new Error('Tripo task succeeded but returned no model URL.');
        return modelUrl;
      }
      if (status.status && TERMINAL_FAILURE_STATUSES.has(status.status)) {
        const detail = status.error_msg ? ` (${status.error_msg})` : '';
        throw new Error(
          `Tripo task ${taskId} ended with status "${status.status}".${detail}`,
        );
      }

      this.logger.debug(
        `Tripo task ${taskId}: status=${status.status} progress=${status.progress ?? 0}`,
      );
      await sleep(this.pollIntervalMs);
    }

    throw new Error(`Timed out waiting for Tripo task ${taskId}.`);
  }

  private async fetchTask(taskId: string): Promise<TripoTaskResponse['data']> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TripoTaskResponse>(
          `${this.baseUrl}/task/${taskId}`,
          {
            headers: this.authHeaders(),
            timeout: 15_000,
          },
        ),
      );
      this.assertTripoOk(response.data);
      return response.data.data;
    } catch (error) {
      throw this.toUnprocessable(`Polling Tripo task ${taskId} failed.`, error);
    }
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  private assertTripoOk(body: TripoTaskResponse): void {
    if (body.code !== 0)
      throw new Error(body.message || `Tripo error code ${body.code}`);
  }

  private toUnprocessable(message: string, error: unknown): Error {
    if (error instanceof AxiosError && error.response) {
      return new Error(
        `${message} [${error.response.status}] ${JSON.stringify(error.response.data).slice(0, 500)}`,
      );
    }
    return error instanceof Error
      ? new Error(`${message} ${error.message}`)
      : new Error(message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
