import type { CheckFinishedMatchesUseCase } from '@application/use-cases/check-finished-matches.use-case';
import type { CheckUpcomingMatchesUseCase } from '@application/use-cases/check-upcoming-matches.use-case';

import type { NotificationDispatcher } from '@infrastructure/discord/notification-dispatcher';
import type { Logger } from '@shared/logger/logger';

export interface MatchSchedulerOptions {
  readonly tickIntervalMs: number;
  readonly upcomingHorizonMs: number;
  readonly finishedLookbackMs: number;
}

export class MatchScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;

  public constructor(
    private readonly checkUpcoming: CheckUpcomingMatchesUseCase,
    private readonly checkFinished: CheckFinishedMatchesUseCase,
    private readonly dispatcher: NotificationDispatcher,
    private readonly logger: Logger,
    private readonly options: MatchSchedulerOptions,
  ) {}

  public start(): void {
    if (this.timer !== null) {
      return;
    }
    this.logger.info('MatchScheduler starting', {
      tickIntervalMs: this.options.tickIntervalMs,
      upcomingHorizonMs: this.options.upcomingHorizonMs,
      finishedLookbackMs: this.options.finishedLookbackMs,
    });
    this.timer = setInterval(() => {
      void this.runTick();
    }, this.options.tickIntervalMs);
    // Fire a first tick on next event-loop turn so we don't wait the full interval at boot.
    setImmediate(() => {
      void this.runTick();
    });
  }

  public stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.info('MatchScheduler stopped');
  }

  private async runTick(): Promise<void> {
    if (this.stopped || this.running) {
      return;
    }
    this.running = true;
    const started = Date.now();
    try {
      const upcoming = await this.checkUpcoming.execute({
        horizonMs: this.options.upcomingHorizonMs,
      });
      const finished = await this.checkFinished.execute({
        lookbackMs: this.options.finishedLookbackMs,
      });

      for (const pending of upcoming) {
        await this.dispatcher.deliver(pending);
      }
      for (const pending of finished) {
        await this.dispatcher.deliver(pending);
      }

      this.logger.info('MatchScheduler tick completed', {
        upcoming: upcoming.length,
        finished: finished.length,
        durationMs: Date.now() - started,
      });
    } catch (error: unknown) {
      this.logger.error('MatchScheduler tick failed', {
        err: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
