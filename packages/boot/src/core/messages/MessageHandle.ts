import { Handle, Handles, HandleType } from '../handles';
import { Abstract, isClass, Injectable, isUndefined, isString, ProviderTypes } from '@tsdi/ioc';
import { MessageContext, MsgEventToken, MsgDataToken } from './MessageContext';
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

    send(event: string | T, data?: any, fac?: (...providers: ProviderTypes[]) => T): Promise<void> {
        if (isString(event)) {
            let providers = [{ provide: MsgEventToken, useValue: event }, { provide: MsgDataToken, useValue: data }];
            let ctx = fac ? fac(...providers) : this.container.resolve(MessageContext, ...providers) as T;
            return this.execute(ctx);
        } else {
            return this.execute(event);
        }
    }
    protected registerHandle(HandleType: HandleType<T>, setup?: boolean): this {
        if (isClass(HandleType)) {
            this.container.register(HandleType);
        }
        this.use(HandleType);
        return this;
    }
}
