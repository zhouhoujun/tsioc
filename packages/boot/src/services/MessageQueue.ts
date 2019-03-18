import { RootModule, CompositeHandle, MessageContext, Next } from '../core';
import { Singleton } from '@ts-ioc/ioc';


/**
 * message queue.
 *
 * @export
 * @class MessageQueue
 * @extends {CompositeHandle<T>}
 * @template T
 */
@RootModule
@Singleton
export class MessageQueue<T extends MessageContext> extends CompositeHandle<T> {

    /**
     * send message.
     *
     * @param {T} ctx
     * @param {Next} [next]
     * @returns {Promise<void>}
     * @memberof MessageQueue
     */
    async send(ctx: T, next?: Next): Promise<void> {
        return this.execute(ctx, next);
    }
}
