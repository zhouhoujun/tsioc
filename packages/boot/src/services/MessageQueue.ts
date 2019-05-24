import { MessageContext, Handles, IHandle, HandleType } from '../core';
import { Singleton, Type, isClass } from '@tsdi/ioc';


/**
 * message queue.
 *
 * @export
 * @class MessageQueue
 * @extends {BuildHandles<T>}
 * @template T
 */

@Singleton
export class MessageQueue<T extends MessageContext> extends Handles<T> {

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

    protected registerHandle(HandleType: HandleType<T>, setup?: boolean): this {
        if (isClass(HandleType)) {
            this.container.register(HandleType);
        }
        this.use(HandleType);
        return this;
    }
}
