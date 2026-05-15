import { token } from '@tsdi/ioc';
import { TelegramAgentChannelOptions } from './telegram-options';

export const TELEGRAM_AGENT_CHANNEL_OPTIONS = token<TelegramAgentChannelOptions>('TELEGRAM_AGENT_CHANNEL_OPTIONS');
