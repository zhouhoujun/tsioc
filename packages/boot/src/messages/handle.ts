import { Abstract } from '@tsdi/ioc';
import { MessageContext } from './ctx';
import { Handle } from '../handles/Handle';


/**
 * message handle.
 *
 * @export
 * @abstract
 * @class MessageHandle
 * @extends {Middleware<MessageContext>}
 */
@Abstract()
export abstract class MessageHandle<T extends MessageContext = MessageContext> extends Handle<T> {

    /**
     * execute middleware.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;
}
