import {
    isClass, Injectable, isString, isFunction, Token, isUndefined, Inject,
    Action, AsyncHandler, ClassType, isInjector, Singleton, INJECTOR, Injector, isProvide
} from '@tsdi/ioc';
import { MessageContext, MessageOption } from './ctx';
import { IMessageQueue } from './type';
import { HandleType, IHandle } from '../handles/Handle';
import { Handles } from '../handles/Handles';
import { CTX_OPTIONS, ROOT_MESSAGEQUEUE } from '../tk';
import { isBaseOf } from 'packages/ioc/src/utils/lang';



/**
 * composite message.
 *
 * @export
 * @abstract
 * @class MessageQueue
 * @extends {Handles<T>}
 * @template T
 */
@Injectable()
export class MessageQueue<T extends MessageContext = MessageContext> extends Handles<T> implements IMessageQueue<T> {


    @Inject(INJECTOR)
    private _injector: Injector;

    /**
     * get injector of current message queue.
     */
    getInjector(): Injector {
        return this._injector;
    }

    private completed: ((ctx: T) => void)[];

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        ctx.setValue(Injector, this.getInjector())
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
     */
    send(ctx: T): Promise<void>;
    /**
     * send message
     *
     * @template TOpt
     * @param {MessageOption} options
     * @returns {Promise<void>}
     */
    send(options: MessageOption): Promise<void>;
    /**
     * send message
     *
     * @param {string} event
     * @param {*} data
     * @returns {Promise<void>}
     */
    send(event: string, data: any, injector?: Injector): Promise<void>;
    /**
     * send message
     *
     * @param {string} event
     * @param {string} type
     * @param {*} data
     * @param {ICoreInjector} [injector]
     * @returns {Promise<void>}
     */
    send(event: string, type: string, data: any, injector?: Injector): Promise<void>;
    send(event: any, type?: any, data?: any, injector?: Injector): Promise<void> {
        if (event instanceof MessageContext) {
            return this.execute(event as T);
        } else {
            if (isInjector(data)) {
                injector = data as Injector;
                data = undefined;
            }
            injector = injector || this.getInjector();
            let option;
            if (isString(event)) {
                if (!isString(type)) {
                    data = type;
                    type = undefined;
                } else if (isString(type) && isUndefined(data)) {
                    data = type;
                    type = undefined;
                }
                option = {
                    event: event,
                    type: type,
                    data: data
                };
            } else {
                if (event.injector) {
                    injector = event.injector;
                }
                option = event;
            }
            let ctx = injector.getService({ token: MessageContext, target: this, defaultToken: MessageContext }, { provide: CTX_OPTIONS, useValue: option });

            return this.execute(ctx as T);
        }
    }

    /**
     * subescribe message.
     *
     * @param {(ctx: T, next: () => Promise<void>) => Promise<void>} subscriber
     */
    subscribe(subscriber: (ctx: T, next: () => Promise<void>) => Promise<void>);
    /**
     * subscribe message by handle instance;
     *
     * @param {IHandle} handle
     */
    subscribe(handle: IHandle);
    /**
     * subscribe message by handle type or token.
     *
     * @param {IHandle} handle
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
     */
    unsubscribe(handle: IHandle);
    /**
     * subscribe message by handle type or token.
     *
     * @param {IHandle} handle
     */
    unsubscribe(handle: Token<IHandle>);
    unsubscribe(haddle: HandleType<T>) {
        this.unuse(haddle);
    }

    protected regHandle(handle: HandleType<T>): this {
        isClass(handle) && this.getInjector().registerType(handle);
        return this;
    }

    protected toHandle(handleType: HandleType<T>): AsyncHandler<T> {
        if (handleType instanceof Action) {
            return handleType.toAction() as AsyncHandler<T>;
        } else if (isProvide(handleType) || isBaseOf(handleType, Action)) {
            const handle = this.getInjector().get(handleType) ?? this.getInjector().getContainer().regedState.getInjector(handleType as ClassType)?.get(handleType);
            return handle?.toAction?.() as AsyncHandler<T>;
        } else if (isFunction(handleType)) {
            return handleType as AsyncHandler<T>;
        }
        return null;
    }
}

/**
 * message queue.
 *
 * @export
 * @class MessageQueue
 * @extends {BuildHandles<T>}
 * @template T
 */
@Singleton(ROOT_MESSAGEQUEUE)
export class RootMessageQueue<T extends MessageContext = MessageContext> extends MessageQueue<T> { }
