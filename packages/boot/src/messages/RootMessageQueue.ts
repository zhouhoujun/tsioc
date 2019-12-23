import { Singleton } from '@tsdi/ioc';
import { RootMessageQueueToken } from './IMessageQueue';
import { MessageContext } from './MessageContext';
import { MessageQueue } from './MessageQueue';


/**
 * message queue.
 *
 * @export
 * @class MessageQueue
 * @extends {BuildHandles<T>}
 * @template T
 */

@Singleton(RootMessageQueueToken)
export class RootMessageQueue<T extends MessageContext = MessageContext> extends MessageQueue<T> {

}
