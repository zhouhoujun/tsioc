import { Singleton } from '@tsdi/ioc';
import { RootMessageQueueToken } from '../messages/IMessageQueue';
import { MessageContext } from '../messages/MessageContext';
import { MessageQueue } from '../messages/MessageQueue';


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
