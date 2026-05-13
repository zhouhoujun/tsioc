import { GatewayConfig, defaultGatewayConfig } from './contracts/GatewayConfig';

export interface AgentGatewayOptions {
    gateway?: GatewayConfig;
}

export const defaultAgentGatewayOptions: AgentGatewayOptions = {
    gateway: { ...defaultGatewayConfig }
};
