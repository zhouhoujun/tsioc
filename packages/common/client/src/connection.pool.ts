import { Injectable, OnDestroy, Abstract } from '@tsdi/ioc';
import { Connection, ConnectionPoolOptions, ConnectionPoolStats } from './pool';

/**
 * Connection factory interface.
 */
@Abstract()
export abstract class ConnectionFactory {
    /**
     * create a new connection.
     */
    abstract create(): Promise<Connection>;
}

/**
 * Connection pool manager abstract interface.
 *
 * 连接池管理器，管理连接的创建、获取、释放和销毁。
 */
@Abstract()
export abstract class ConnectionPool implements OnDestroy {
    /**
     * pool options.
     */
    abstract get options(): ConnectionPoolOptions;

    /**
     * pool statistics.
     */
    abstract get stats(): ConnectionPoolStats;

    /**
     * acquire a connection from pool.
     */
    abstract acquire(): Promise<Connection>;

    /**
     * release a connection back to pool.
     * @param connection connection to release.
     */
    abstract release(connection: Connection): void;

    /**
     * validate a connection.
     * @param connection connection to validate.
     */
    abstract validate(connection: Connection): boolean;

    /**
     * destroy a connection.
     * @param connection connection to destroy.
     */
    abstract destroy(connection: Connection): Promise<void>;

    /**
     * clear all connections in pool.
     */
    abstract clear(): Promise<void>;

    /**
     * on destroy.
     */
    onDestroy(): void {
        this.clear();
    }
}

/**
 * Default connection pool implementation.
 */
@Injectable()
export class DefaultConnectionPool extends ConnectionPool {
    private connections: Connection[] = [];
    private activeConnections: Set<Connection> = new Set();
    private pendingQueue: Array<{ resolve: (conn: Connection) => void; reject: (err: Error) => void }> = [];
    private statsData: ConnectionPoolStats = {
        total: 0,
        available: 0,
        active: 0,
        pending: 0,
        acquiredCount: 0,
        releasedCount: 0,
        createdCount: 0,
        destroyedCount: 0
    };
    private validationTimer?: ReturnType<typeof setInterval>;

    constructor(
        private factory: ConnectionFactory,
        options: ConnectionPoolOptions = {}
    ) {
        super();
        this._options = {
            min: options.min ?? 0,
            max: options.max ?? 10,
            acquireTimeout: options.acquireTimeout ?? 30000,
            idleTimeout: options.idleTimeout ?? 30000,
            connectionTimeout: options.connectionTimeout ?? 10000,
            validationInterval: options.validationInterval ?? 10000,
            evictStale: options.evictStale ?? true
        };

        this.initMinConnections();
        this.startValidation();
    }

    private _options: ConnectionPoolOptions;

    get options(): ConnectionPoolOptions {
        return this._options;
    }

    get stats(): ConnectionPoolStats {
        this.statsData.total = this.connections.length;
        this.statsData.available = this.connections.length - this.activeConnections.size;
        this.statsData.active = this.activeConnections.size;
        this.statsData.pending = this.pendingQueue.length;
        return this.statsData;
    }

    private async initMinConnections(): Promise<void> {
        for (let i = 0; i < this._options.min!; i++) {
            try {
                const conn = await this.factory.create();
                this.connections.push(conn);
                this.statsData.createdCount++;
            } catch (err) {
                // ignore initial connection errors
            }
        }
    }

    private startValidation(): void {
        if (this._options.validationInterval && this._options.evictStale) {
            this.validationTimer = setInterval(() => this.evictStaleConnections(), this._options.validationInterval);
        }
    }

    private async evictStaleConnections(): Promise<void> {
        const now = Date.now();
        const idleTimeout = this._options.idleTimeout!;

        for (const conn of this.connections) {
            if (!this.activeConnections.has(conn) && (now - conn.lastUsed) > idleTimeout) {
                await this.destroy(conn);
            }
        }

        // Ensure minimum connections
        while (this.connections.length < this._options.min!) {
            try {
                const conn = await this.factory.create();
                this.connections.push(conn);
                this.statsData.createdCount++;
            } catch (err) {
                break;
            }
        }
    }

    async acquire(): Promise<Connection> {
        // Try to get an available connection
        for (const conn of this.connections) {
            if (!this.activeConnections.has(conn) && this.validate(conn)) {
                this.activeConnections.add(conn);
                conn.lastUsed = Date.now();
                this.statsData.acquiredCount++;
                return conn;
            }
        }

        // Create new connection if under max limit
        if (this.connections.length < this._options.max!) {
            try {
                const conn = await this.factory.create();
                this.connections.push(conn);
                this.activeConnections.add(conn);
                conn.lastUsed = Date.now();
                this.statsData.createdCount++;
                this.statsData.acquiredCount++;
                return conn;
            } catch (err) {
                // Failed to create, queue request
            }
        }

        // Queue the request
        return new Promise<Connection>((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.pendingQueue.findIndex(p => p.resolve === resolve);
                if (index >= 0) {
                    this.pendingQueue.splice(index, 1);
                    reject(new Error('Connection acquire timeout'));
                }
            }, this._options.acquireTimeout!);

            this.pendingQueue.push({
                resolve: (conn) => {
                    clearTimeout(timeout);
                    resolve(conn);
                },
                reject: (err) => {
                    clearTimeout(timeout);
                    reject(err);
                }
            });
        });
    }

    release(connection: Connection): void {
        if (!this.activeConnections.has(connection)) {
            return;
        }

        this.activeConnections.delete(connection);
        connection.lastUsed = Date.now();
        this.statsData.releasedCount++;

        // Process pending requests
        if (this.pendingQueue.length > 0 && this.validate(connection)) {
            const pending = this.pendingQueue.shift();
            if (pending) {
                this.activeConnections.add(connection);
                this.statsData.acquiredCount++;
                pending.resolve(connection);
            }
        }
    }

    validate(connection: Connection): boolean {
        return connection.active;
    }

    async destroy(connection: Connection): Promise<void> {
        const index = this.connections.indexOf(connection);
        if (index >= 0) {
            this.connections.splice(index, 1);
            this.activeConnections.delete(connection);
            await connection.close();
            this.statsData.destroyedCount++;
        }
    }

    async clear(): Promise<void> {
        if (this.validationTimer) {
            clearInterval(this.validationTimer);
        }

        // Reject all pending requests
        for (const pending of this.pendingQueue) {
            pending.reject(new Error('Pool cleared'));
        }
        this.pendingQueue = [];

        // Close all connections
        for (const conn of this.connections) {
            await conn.close();
            this.statsData.destroyedCount++;
        }
        this.connections = [];
        this.activeConnections.clear();
    }
}