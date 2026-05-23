import { Client, Events, GatewayIntentBits } from 'discord.js';

import type { Logger } from '@shared/logger/logger';

import type { InteractionDispatcher } from './events/interaction-dispatcher';

export interface DiscordBotOptions {
  readonly token: string;
}

export class DiscordBot {
  private readonly client: Client;

  public constructor(
    private readonly dispatcher: InteractionDispatcher,
    private readonly logger: Logger,
  ) {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

    this.client.once(Events.ClientReady, (ready) => {
      this.logger.info('Discord client ready', { tag: ready.user.tag });
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
  }

  public async stop(): Promise<void> {
    await this.client.destroy();
  }
}
