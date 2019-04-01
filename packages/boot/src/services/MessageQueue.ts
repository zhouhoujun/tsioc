import { CompositeHandle, MessageContext } from '../core';
import { Singleton } from '@tsdi/ioc';


/**
 * message queue.
 *
 * @export
 * @class MessageQueue
 * @extends {CompositeHandle<T>}
 * @template T
 */

@Singleton
export class MessageQueue<T extends MessageContext> extends CompositeHandle<T> {

    /**
     * send message.
     *
     * @param {T} ctx
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof MessageQueue
     */
    async send(ctx: T, next?: () => Promise<void>): Promise<void> {
        return this.execute(ctx, next);
    }
}
