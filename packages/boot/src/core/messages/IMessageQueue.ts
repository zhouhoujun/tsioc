import { HandleType } from '../handles';
import { MessageContext } from './MessageContext';
import { InjectToken, ProviderTypes } from '@tsdi/ioc';


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
     * @param {T} ctx
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof IMessageQueue
     */
    send(ctx: T): Promise<void>;
    /**
     * send message
     *
     * @param {string} event
     * @param {*} data
     * @returns {Promise<void>}
     * @memberof IMessageQueue
     */
    send(event: string, data: any, fac?: (...providers: ProviderTypes[]) => T): Promise<void>;

    /**
     * use message handle
     *
     * @param {HandleType<T>} handle
     * @param {boolean} [setup]
     * @returns {this}
     * @memberof IMessageQueue
     */
    use(handle: HandleType<T>, setup?: boolean): this;

    /**
     * has message handle
     *
     * @param {HandleType<T>} handle
     * @returns {boolean}
     * @memberof IMessageQueue
     */
    has(handle: HandleType<T>): boolean;

    /**
     * use message handle before.
     *
     * @param {HandleType<T>} handle
     * @param {(HandleType<T> | boolean)} before
     * @param {boolean} [setup]
     * @returns {this}
     * @memberof IMessageQueue
     */
    useBefore(handle: HandleType<T>, before: HandleType<T> | boolean, setup?: boolean): this;

    /**
     * use message handle after.
     *
     * @param {HandleType<T>} handle
     * @param {HandleType<T>} [after]
     * @param {boolean} [setup]
     * @returns {this}
     * @memberof IMessageQueue
     */
    useAfter(handle: HandleType<T>, after?: HandleType<T>, setup?: boolean): this;

}

/**
 * root message queue token.
 */
export const RootMessageQueueToken = new InjectToken<IMessageQueue<MessageContext>>('BOOT_ROOT_MessageQueue');
