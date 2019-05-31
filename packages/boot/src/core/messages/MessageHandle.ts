import { Handle } from '../handles';
import { Abstract } from '@tsdi/ioc';
import { MessageContext } from './MessageContext';


/**
 * message handle.
 *
 * @export
 * @abstract
 * @class AnnoationMiddleware
 * @extends {Middleware<MessageContext>}
 */
@Abstract()
export abstract class MessageHandle extends Handle<MessageContext> {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {MessageContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof AnnoationMiddleware
     */
    abstract execute(ctx: MessageContext, next: () => Promise<void>): Promise<void>;
}
