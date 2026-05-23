import { ProviderRateLimitError, ProviderUnavailableError } from '@domain/errors/provider-error';

export interface HttpGetOptions {
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
}

export interface HttpResponse<T> {
  readonly status: number;
  readonly data: T;
}

const DEFAULT_TIMEOUT_MS = 5_000;

export async function httpGetJson<T>(
  providerName: string,
  url: string,
  options: HttpGetOptions = {},
): Promise<HttpResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const init: RequestInit = {
      method: 'GET',
      signal: controller.signal,
    };
    if (options.headers !== undefined) {
      init.headers = options.headers;
    }
    const response = await fetch(url, init);

    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      throw new ProviderRateLimitError(providerName, retryAfter);
    }

    if (!response.ok) {
      throw new ProviderUnavailableError(
        providerName,
        `HTTP ${response.status.toString()} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as T;
    return { status: response.status, data };
  } catch (error: unknown) {
    if (error instanceof ProviderRateLimitError || error instanceof ProviderUnavailableError) {
      throw error;
    }
    throw new ProviderUnavailableError(providerName, error);
  } finally {
    clearTimeout(timeout);
  }
}

function parseRetryAfter(header: string | null): number | null {
  if (header === null) {
    return null;
  }
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : null;
}
