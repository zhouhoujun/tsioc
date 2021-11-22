/**
 * trasport strategy.
 */
export interface TransportStrategy {
    /**
     * connect.
     */
    connect(): void | Promise<void>;
    /**
     * disconnect server.
     */
    disconnect(): void | Promise<void>;
}
