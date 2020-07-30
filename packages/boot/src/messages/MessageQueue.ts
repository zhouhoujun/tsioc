import { isClass, Injectable, isString, isFunction, Token, isUndefined, INJECTOR, Inject, isToken, Action, AsyncHandler, InjectorProxyToken, InjectorProxy, TypeReflectsToken, ClassType, isInjector } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { MessageContext, MessageOption } from './MessageContext';
import { IMessageQueue } from './IMessageQueue';
import { HandleType, IHandle } from '../handles/Handle';
import { Handles } from '../handles/Handles';
import { CTX_CURR_INJECTOR } from '../tk';



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


    @Inject(InjectorProxyToken)
    private _injector: InjectorProxy<ICoreInjector>;

    /**
     * get injector of current message queue.
     */
    getInjector(): ICoreInjector {
        return this._injector();
    }

    private completed: ((ctx: T) => void)[];

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        ctx.setValue(CTX_CURR_INJECTOR, this.getInjector())
        await super.execute(ctx, next);
        this.completed && this.completed.map(cb => {
            cb(ctx);
        });
    }

    /**
     * register completed callbacks.
     * @param callback callback.T
     */
    done(callback: (ctx: T) => void) {
        if (!this.completed) {
            this.completed = [];
        }
        this.completed.push(callback);
    }

    /**
     * send message
     *
     * @param {T} ctx message context
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof IMessageQueue
     */
    send(ctx: T): Promise<void>;
    /**
     * send message
     *
     * @template TOpt
     * @param {MessageOption} options
     * @returns {Promise<void>}
     * @memberof IMessageQueue
     */
    send(options: MessageOption): Promise<void>;
    /**
     * send message
     *
     * @param {string} event
     * @param {*} data
     * @returns {Promise<void>}
     * @memberof IMessageQueue
     */
    send(event: string, data: any, injector?: ICoreInjector): Promise<void>;
    /**
     * send message
     *
     * @param {string} event
     * @param {string} type
     * @param {*} data
     * @param {ICoreInjector} [injector]
     * @returns {Promise<void>}
     * @memberof IMessageQueue
     */
    send(event: string, type: string, data: any, injector?: ICoreInjector): Promise<void>;
    send(event: any, type?: any, data?: any, injector?: ICoreInjector): Promise<void> {
        if (event instanceof MessageContext) {
            return this.execute(event as T);
        } else {
            if (isInjector(data)) {
                injector = data as ICoreInjector;
                data = undefined;
            }
            injector = injector || this.getInjector();
            let ctx = injector.getService({ token: MessageContext, target: this, defaultToken: MessageContext });
            if (isString(event)) {
                if (!isString(type)) {
                    data = type;
                    type = undefined;
                } else if (isString(type) && isUndefined(data)) {
                    data = type;
                    type = undefined;
                }
                ctx.setOptions({
                    event: event,
                    type: type,
                    data: data
                });
            } else {
                if (event.injector) {
                    injector = event.injector;
                }
                ctx.setOptions(event);
            }
            ctx.setValue(INJECTOR, injector);

            return this.execute(ctx as T);
        }
    }

    /**
     * subescribe message.
     *
     * @param {(ctx: T, next: () => Promise<void>) => Promise<void>} subscriber
     * @memberof IMessageQueue
     */
    subscribe(subscriber: (ctx: T, next: () => Promise<void>) => Promise<void>);
    /**
     * subscribe message by handle instance;
     *
     * @param {IHandle} handle
     * @memberof IMessageQueue
     */
    subscribe(handle: IHandle);
    /**
     * subscribe message by handle type or token.
     *
     * @param {IHandle} handle
     * @memberof IMessageQueue
     */
    subscribe(handle: Token<IHandle>);
    subscribe(haddle: HandleType<T>) {
        this.use(haddle);
    }

    /**
     * subescribe message.
     *
     * @param {(ctx: T, next: () => Promise<void>) => Promise<void>} subscriber
     * @memberof IMessageQueue
     */
    unsubscribe(subscriber: (ctx: T, next: () => Promise<void>) => Promise<void>);
    /**
     * subscribe message by handle instance;
     *
     * @param {IHandle} handle
     * @memberof IMessageQueue
     */
    unsubscribe(handle: IHandle);
    /**
     * subscribe message by handle type or token.
     *
     * @param {IHandle} handle
     * @memberof IMessageQueue
     */
    unsubscribe(handle: Token<IHandle>);
    unsubscribe(haddle: HandleType<T>) {
        this.unuse(haddle);
    }

    protected registerHandle(HandleType: HandleType<T>): this {
        if (isClass(HandleType)) {
            this.getInjector().registerType(HandleType);
        }
        return this;
    }

    protected toHandle(handleType: HandleType<T>): AsyncHandler<T> {
        if (handleType instanceof Action) {
            return handleType.toAction() as AsyncHandler<T>;
        } else if (isToken(handleType)) {
            const handle = this.getInjector().get<Action>(handleType) ?? this.getInjector().getSingleton(TypeReflectsToken).get(handleType as ClassType)?.getInjector()?.get(handleType);
            return handle?.toAction?.() as AsyncHandler<T>;
        } else if (isFunction(handleType)) {
            return handleType as AsyncHandler<T>;
        }
        return null;
    }
}
