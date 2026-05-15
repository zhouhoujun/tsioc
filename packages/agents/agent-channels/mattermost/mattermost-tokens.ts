import { token } from '@tsdi/ioc';
import { MattermostAgentChannelOptions } from './mattermost-options';

export const MATTERMOST_AGENT_CHANNEL_OPTIONS = token<MattermostAgentChannelOptions>('MATTERMOST_AGENT_CHANNEL_OPTIONS');
