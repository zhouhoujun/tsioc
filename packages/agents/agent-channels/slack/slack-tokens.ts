import { token } from '@tsdi/ioc';
import { SlackAgentChannelOptions } from './slack-options';

export const SLACK_AGENT_CHANNEL_OPTIONS = token<SlackAgentChannelOptions>('SLACK_AGENT_CHANNEL_OPTIONS');
