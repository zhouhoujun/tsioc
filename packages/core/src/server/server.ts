import { Destroy } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';

/**
 * server.
 */
export interface Server extends Destroy {
    /**
     * connect server
     */
    connect(ctx: ApplicationContext): void | Promise<void>;

    /**
     * disconnect server.
     */
    disconnect(): void | Promise<void>;
}
