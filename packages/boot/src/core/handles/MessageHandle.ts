import { Handle, Next } from './Handle';
import { HandleContext } from './HandleContext';
import { Abstract } from '@tsdi/ioc';

/**
 * message context.
 *
 * @export
 * @class MessageContext
 * @extends {HandleContext}
 */
export class MessageContext extends HandleContext {
    /**
     * message data.
     *
     * @type {*}
     * @memberof MessageContext
     */
    data?: any;
}

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
     * @param {Next} next
     * @returns {Promise<void>}
     * @memberof AnnoationMiddleware
     */
    abstract execute(ctx: MessageContext, next: Next): Promise<void>;
}
