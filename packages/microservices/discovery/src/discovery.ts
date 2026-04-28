/**
 * Service endpoint interface.
 */
export interface ServiceEndpoint {
    /**
     * service endpoint id.
     */
    id: string;
    /**
     * service name.
     */
    name: string;
    /**
     * endpoint address (host:port or url).
     */
    address: string;
    /**
     * endpoint protocol (http, tcp, etc).
     */
    protocol?: string;
    /**
     * endpoint port.
     */
    port?: number;
    /**
     * endpoint metadata.
     */
    metadata?: Record<string, any>;
    /**
     * endpoint health status.
     */
    status?: 'UP' | 'DOWN' | 'UNKNOWN';
    /**
     * last updated timestamp.
     */
    updatedAt?: number;
}

/**
 * Service info interface for registration.
 */
export interface ServiceInfo {
    /**
     * service name.
     */
    name: string;
    /**
     * service id (unique identifier).
     */
    id?: string;
    /**
     * service address.
     */
    address: string;
    /**
     * service protocol.
     */
    protocol?: string;
    /**
     * service port.
     */
    port?: number;
    /**
     * service metadata.
     */
    metadata?: Record<string, any>;
    /**
     * health check path.
     */
    healthCheckPath?: string;
    /**
     * health check interval in seconds.
     */
    healthCheckInterval?: number;
}

/**
 * Service discovery options.
 */
export interface ServiceDiscoveryOptions {
    /**
     * registry service url.
     */
    registryUrl?: string;
    /**
     * heartbeat interval in seconds.
     */
    heartbeatInterval?: number;
    /**
     * retry interval in seconds.
     */
    retryInterval?: number;
    /**
     * cache refresh interval in seconds.
     */
    cacheRefreshInterval?: number;
    /**
     * enable caching.
     */
    enableCache?: boolean;
    /**
     * cache expiration in seconds.
     */
    cacheExpiration?: number;
}

/**
 * Service endpoint selector options.
 */
export interface EndpointSelectorOptions {
    /**
     * selection strategy: 'random', 'round-robin', 'least-connections', 'weighted'.
     */
    strategy?: 'random' | 'round-robin' | 'least-connections' | 'weighted';
    /**
     * weight configuration per endpoint.
     */
    weights?: Record<string, number>;
}

/**
 * Service watch callback.
 */
export type ServiceWatchCallback = (endpoints: ServiceEndpoint[]) => void;