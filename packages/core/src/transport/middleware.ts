import { AsyncHandler, DispatchHandler, Type } from '@tsdi/ioc';
import { TransportContext } from './context';


/**
 * Endpoint implements {@link DispatchHandler}.
 *
 * @export
 */
export interface Endpoint<T extends TransportContext = TransportContext> extends DispatchHandler<T, Promise<void>> {
    /**
     * middleware handle.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    handle(ctx: T, next: () => Promise<void>): Promise<void>;
}

 
/**
* message type for register in {@link Middlewares}.
*/
export type Middleware<T extends TransportContext = TransportContext> = AsyncHandler<TransportContext> | Endpoint<T> | Type<Endpoint>;