import { AsyncHandler, DispatchHandler, tokenId, Type } from '@tsdi/ioc';
import { TransportContext } from './context';


/**
 * Middlewarable implements {@link DispatchHandler}.
 *
 * @export
 */
export interface Middlewarable<T extends TransportContext = TransportContext> extends DispatchHandler<T, Promise<void>> {
    /**
     * middleware handle.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    handle(ctx: T, next?: () => Promise<void>): Promise<void>;
}

 
/**
* message type for register in {@link Middlewares}.
*/
export type Middleware<T extends TransportContext = TransportContext> = AsyncHandler<TransportContext> | Middlewarable<T>;

/**
 * middlewares token.
 */
export const MIDDLEWARES = tokenId<Middleware[]>('MIDDLEWARES');