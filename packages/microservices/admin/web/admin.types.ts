import { GatewayConfigDiff, GatewayRouteOptions } from '@tsdi/gateway';

export interface GatewayAdminRuleCondition {
    field?: string;
    name?: string;
    operator?: string;
    value?: unknown;
}

export interface GatewayAdminRuleSummary {
    id?: string;
    name?: string;
    priority?: number;
    when?: GatewayAdminRuleCondition[];
    action?: { type?: string };
}

export interface GatewayAdminApiState {
    routes?: GatewayRouteOptions[];
    rules?: GatewayAdminRuleSummary[];
    services?: string[];
    dynamic?: { routes?: unknown[]; rules?: unknown[] };
    version?: number;
    auth?: { enabled: boolean; mode: 'none' | 'oidc' | 'oauth2' | 'service' };
}

export interface GatewayAdminConfigEntry {
    version: number;
    timestamp: string;
    source?: string;
    actor?: string;
    diff?: GatewayConfigDiff;
}

export interface GatewayAdminServiceSummary {
    name: string;
    routes: number;
    enabled: number;
}

export interface GatewayAdminServiceEndpoint {
    id: string;
    address: string;
    protocol?: string;
    port?: number;
    status?: string;
    weight?: number;
    version?: string;
    tags?: string[];
}

export interface GatewayAdminServiceDetail {
    name: string;
    endpoints: GatewayAdminServiceEndpoint[];
}
