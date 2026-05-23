import { DomainError } from './domain-error';

export class ProviderError extends DomainError {
  public constructor(
    public readonly providerName: string,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(`[${providerName}] ${message}`);
  }
}

export class ProviderRateLimitError extends ProviderError {
  public constructor(providerName: string, retryAfterSeconds: number | null = null) {
    super(
      providerName,
      retryAfterSeconds === null
        ? 'Rate limit exceeded.'
        : `Rate limit exceeded. Retry after ${retryAfterSeconds.toString()}s.`,
    );
  }
}

export class ProviderUnavailableError extends ProviderError {
  public constructor(providerName: string, cause?: unknown) {
    super(providerName, 'Provider is unavailable or returned an unexpected error.', cause);
  }
}
