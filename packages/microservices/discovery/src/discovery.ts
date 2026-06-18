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
     * endpoint tags.
     */
    tags?: string[];
    /**
     * endpoint health status.
     */
    status?: 'UP' | 'DOWN' | 'UNKNOWN';
    /**
     * last updated timestamp.
     */
    updatedAt?: number;
    /**
     * registration timestamp.
     */
    registeredAt?: number;
    /**
     * service version.
     */
    version?: string;
    /**
     * health check path.
     */
    healthCheckPath?: string;
    /**
     * health check interval in seconds.
     */
    healthCheckInterval?: number;
    /**
     * time-to-live in milliseconds.
     */
    ttl?: number;
    /**
     * instance weight used for load balancing.
     */
    weight?: number;
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
     * service tags.
     */
    tags?: string[];
    /**
     * service version.
     */
    version?: string;
    /**
     * health check path.
     */
    healthCheckPath?: string;
    /**
     * health check interval in seconds.
     */
    healthCheckInterval?: number;
    /**
     * endpoint ttl in milliseconds.
     */
    ttl?: number;
    /**
     * service weight for weighted selection.
     */
    weight?: number;
}

export interface ServiceQuery {
    /**
     * service name.
     */
    name?: string;
    /**
     * protocol filter.
     */
    protocol?: string;
    /**
     * health status filter.
     */
    status?: 'UP' | 'DOWN' | 'UNKNOWN';
    /**
     * metadata matcher. All provided keys must match.
     */
    metadata?: Record<string, any>;
    /**
     * tag filter. All provided tags must be present.
     */
    tags?: string[];
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
    /**
     * default endpoint ttl in milliseconds.
     */
    ttl?: number;
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
