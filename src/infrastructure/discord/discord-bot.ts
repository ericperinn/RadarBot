import { Client, Events, GatewayIntentBits } from 'discord.js';

import type { Logger } from '@shared/logger/logger';

import type { InteractionDispatcher } from './events/interaction-dispatcher';

export interface DiscordBotOptions {
  readonly token: string;
}

export class DiscordBot {
  public readonly client: Client;
  private readonly readyPromise: Promise<void>;

  public constructor(
    private readonly dispatcher: InteractionDispatcher,
    private readonly logger: Logger,
  ) {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

    this.readyPromise = new Promise<void>((resolve) => {
      this.client.once(Events.ClientReady, (ready) => {
        this.logger.info('Discord client ready', { tag: ready.user.tag });
        resolve();
      });
    });

    this.client.on(Events.InteractionCreate, (interaction) => {
      void this.dispatcher.dispatch(interaction);
    });

    this.client.on(Events.Error, (err) => {
      this.logger.error('Discord client error', { err: err.message });
    });
  }

  public async start(options: DiscordBotOptions): Promise<void> {
    await this.client.login(options.token);
    await this.readyPromise;
  }

  public async stop(): Promise<void> {
    await this.client.destroy();
  }
}
