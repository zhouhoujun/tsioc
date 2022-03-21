/**
 * Startup server.
 */
export interface Startup {
    /**
     * startup server.
     */
    startup(): void | Promise<void>;
}

