import { CompositeHandle, MessageContext, Next } from '../handles';
import { Singleton } from '@ts-ioc/ioc';


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
     * @param {Next} [next]
     * @returns {Promise<void>}
     * @memberof MessageQueue
     */
    async send(ctx: T, next?: Next): Promise<void> {
        return this.execute(ctx, next);
    }
}