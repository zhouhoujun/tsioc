import { token } from '@tsdi/ioc';
import { DiscordAgentChannelOptions } from './discord-options';

export const DISCORD_AGENT_CHANNEL_OPTIONS = token<DiscordAgentChannelOptions>('DISCORD_AGENT_CHANNEL_OPTIONS');
