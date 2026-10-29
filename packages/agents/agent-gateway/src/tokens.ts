import { token } from '@tsdi/ioc';
import { GatewayConfig } from './contracts/GatewayConfig';

export const GATEWAY_CONFIG = token<GatewayConfig>('GATEWAY_CONFIG');

/** Optional host hook: persist the resolved model config to the agent config root. */
export type AgentModelConfigWriter = (model: any) => void;
export const AGENT_MODEL_CONFIG_WRITER = token<AgentModelConfigWriter>('AGENT_MODEL_CONFIG_WRITER');
