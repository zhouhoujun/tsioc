import { Handle, Handles, HandleType } from '../handles';
import { Abstract, isClass, Injectable } from '@tsdi/ioc';
import { MessageContext } from './MessageContext';
import { IMessageQueue } from './IMessageQueue';


/**
 * message handle.
 *
 * @export
 * @abstract
 * @class MessageHandle
 * @extends {Middleware<MessageContext>}
 */
@Abstract()
export abstract class MessageHandle<T extends MessageContext> extends Handle<T> {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof AnnoationMiddleware
     */
    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;
}

/**
 * composite message.
 *
 * @export
 * @abstract
 * @class MessageQueue
 * @extends {Handles<T>}
 * @template T
 */
@Injectable
export class MessageQueue<T extends MessageContext> extends Handles<T> implements IMessageQueue<T> {

    send(ctx: T, next?: () => Promise<void>): Promise<void> {
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
