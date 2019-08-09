import { Handle, Handles, HandleType } from '../handles';
import { Abstract, isClass, Injectable, isUndefined, isString, ProviderTypes, isBaseObject, isFunction } from '@tsdi/ioc';
import { MessageContext, MessageOption } from './MessageContext';
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
export class MessageQueue<T extends MessageContext = MessageContext> extends Handles<T> implements IMessageQueue<T> {

    send(ctx: T): Promise<void>;
    send<T extends MessageOption>(options: T, fac?: () => T): Promise<void>;
    send(event: string, data: any, fac?: () => T): Promise<void>;
    send(event: string, type: string, data: any, fac?: (...providers: ProviderTypes[]) => T): Promise<void>;
    send(event: any, type?: any, data?: any, fac?: () => T): Promise<void> {
        if (event instanceof MessageContext) {
            return this.execute(event as T);
        } else {
            if (isFunction(type)) {
                fac = type;
                type = undefined;
            } else if (isFunction(data)) {
                fac = data;
                data = undefined;
            }
            let ctx = fac ? fac() : this.container.resolve(MessageContext) as T;
            if (isString(event)) {
                if (!isString(type)) {
                    data = type;
                    type = undefined;
                }
                ctx.setOptions({
                    event: event,
                    type: type,
                    data: data
                });
            } else {
                ctx.setOptions(event);
            }
            return this.execute(ctx);
        }
    }

    subscribe(subscriber: (ctx: T, next: () => Promise<void>) => Promise<void>) {
        this.use(subscriber);
    }

    protected registerHandle(HandleType: HandleType<T>, setup?: boolean): this {
        if (isClass(HandleType)) {
            this.container.register(HandleType);
        }
        this.use(HandleType);
        return this;
    }
}
