import { token } from '@tsdi/ioc';
import { AgentChannelsOptions } from './options';
import { AgentConversationChannel } from './contracts/AgentConversationChannel';

export const AGENT_CHANNEL_OPTIONS = token<AgentChannelsOptions>('AGENT_CHANNEL_OPTIONS');
export const AGENT_CHANNELS = token<AgentConversationChannel[]>('AGENT_CHANNELS');
