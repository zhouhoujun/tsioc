import { IInjector, Token } from '@tsdi/ioc';
import { HandleType, IHandle } from '../handles/Handle';
import { MessageContext, MessageOption } from './ctx';


/**
 * application message handle.
 *
 * @export
 * @interface IMessage
 * @template T
 */
export interface IMessage<T extends MessageContext = MessageContext> {
    execute(ctx: T, next: () => Promise<void>): Promise<void>
}

/**
 * message queue.
 *
 * @export
 * @interface IMessageQueue
 * @template T
 */
export interface IMessageQueue<T extends MessageContext = MessageContext> extends IMessage<T> {

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
    send(event: string, data: any, injector?: IInjector): Promise<void>;
    /**
     * send message
     *
     * @param {string} event
     * @param {string} type
     * @param {*} data
     * @param {ICoreInjector} [injector]
     * @returns {Promise<void>}
     */
    send(event: string, type: string, data: any, injector?: IInjector): Promise<void>;

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

    /**
     * subescribe message.
     *
     * @param {(ctx: T, next: () => Promise<void>) => Promise<void>} subscriber
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

    /**
     * use message handle
     *
     * @param {HandleType<T>} handle
     * @param {boolean} [setup]
     * @returns {this}
     */
    use(...handles: HandleType[]): this;

    unuse(...handles: HandleType[]): this;

    /**
     * has message handle
     *
     * @param {HandleType<T>} handle
     * @returns {boolean}
     */
    has(handle: HandleType<T>): boolean;

    /**
     * use message handle before.
     *
     * @param {HandleType<T>} handle
     * @param {(HandleType<T> | boolean)} before
     * @param {boolean} [setup]
     * @returns {this}
     */
    useBefore(handle: HandleType<T>, before: HandleType<T> | boolean, setup?: boolean): this;

    /**
     * use message handle after.
     *
     * @param {HandleType<T>} handle
     * @param {HandleType<T>} [after]
     * @param {boolean} [setup]
     * @returns {this}
     */
    useAfter(handle: HandleType<T>, after?: HandleType<T>, setup?: boolean): this;

}

