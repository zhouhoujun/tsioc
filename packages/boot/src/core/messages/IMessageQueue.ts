import { HandleType } from '../handles';
import { MessageContext } from './MessageContext';
import { InjectToken } from '@tsdi/ioc';

/**
 * message queue.
 *
 * @export
 * @interface IMessageQueue
 * @template T
 */
export interface IMessageQueue<T extends MessageContext> {

    /**
     * send message
     *
     * @param {T} ctx
     * @param {() => Promise<void>} [next]
     * @returns {Promise<void>}
     * @memberof IMessageQueue
     */
    send(ctx: T, next?: () => Promise<void>): Promise<void>;

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
 * message queue token.
 */
export const MessageQueueToken = new InjectToken<IMessageQueue<MessageContext>>('BOOT_MessageQueue');
