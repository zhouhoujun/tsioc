import { ApplicationContext } from '../Context';
import { Disposable } from '../dispose';

/**
 * server.
 */
export interface Server extends Disposable {
    /**
     * connect server
     */
    connect(ctx: ApplicationContext): void | Promise<void>;

}
