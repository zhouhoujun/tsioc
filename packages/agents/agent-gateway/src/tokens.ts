import { token } from '@tsdi/ioc';
import { GatewayConfig } from './contracts/GatewayConfig';

export const GATEWAY_CONFIG = token<GatewayConfig>('GATEWAY_CONFIG');
