import { ApplicationContext } from '../Context';

/**
 * server.
 */
 export interface Server {
    /**
     * connect server
     */
    connect(ctx: ApplicationContext): void | Promise<void>;

    /**
     * disconnect server.
     */
    disconnect(): void| Promise<void>;
}
