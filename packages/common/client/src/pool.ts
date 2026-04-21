/**
 * Connection interface.
 */
export interface Connection {
    /**
     * connection id.
     */
    id: string;
    /**
     * connection is active.
     */
    active: boolean;
    /**
     * last used timestamp.
     */
    lastUsed: number;
    /**
     * close connection.
     */
    close(): Promise<void>;
}

/**
 * Connection pool options.
 */
export interface ConnectionPoolOptions {
    /**
     * minimum connections in pool.
     */
    min?: number;
    /**
     * maximum connections in pool.
     */
    max?: number;
    /**
     * acquire timeout in milliseconds.
     */
    acquireTimeout?: number;
    /**
     * idle timeout in milliseconds.
     */
    idleTimeout?: number;
    /**
     * connection timeout in milliseconds.
     */
    connectionTimeout?: number;
    /**
     * validation interval for checking stale connections.
     */
    validationInterval?: number;
    /**
     * evict stale connections on validation.
     */
    evictStale?: boolean;
}

/**
 * Connection pool statistics.
 */
export interface ConnectionPoolStats {
    /**
     * total connections.
     */
    total: number;
    /**
     * available connections.
     */
    available: number;
    /**
     * active (in use) connections.
     */
    active: number;
    /**
     * pending acquire requests.
     */
    pending: number;
    /**
     * total acquired count.
     */
    acquiredCount: number;
    /**
     * total released count.
     */
    releasedCount: number;
    /**
     * total created count.
     */
    createdCount: number;
    /**
     * total destroyed count.
     */
    destroyedCount: number;
}