import { Abstract,  DispatchHandler } from '@tsdi/ioc';
import { TransportContext } from './context';


/**
 * abstract middleware implements {@link DispatchHandler}.
 *
 * @export
 * @abstract
 * @class Middleware
 */
@Abstract()
export abstract class Middleware<T extends TransportContext = TransportContext> implements DispatchHandler<T, Promise<void>> {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract handle(ctx: T, next: () => Promise<void>): Promise<void>;
}
