import { TypeMetadata, ITypeDecorator, createClassDecorator, ArgsIterator, Type, isString, isClass } from '@tsdi/ioc';
import { MessageHandle, MessageContext } from '../messages';

/**
 * message metadata. use to define the class as message handle register in global message queue.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
export interface MessageMetadata extends TypeMetadata {
    /**
     * message type.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    msgType?: string;

    /**
     * register this message handle before this handle.
     *
     * @type {Type<MessageHandle>}
     * @memberof MessageMetadata
     */
    before?: Type<MessageHandle<MessageContext>>;

    /**
     * register this message handle after this handle.
     *
     * @type {Type<MessageHandle>}
     * @memberof MessageMetadata
     */
    after?: Type<MessageHandle<MessageContext>>;
}

/**
 * Message decorator, for class. use to define the class as message handle register in global message queue.
 *
 * @export
 * @interface IMessageDecorator
 * @extends {ITypeDecorator<ClassMetadata>}
 */
export interface IMessageDecorator extends ITypeDecorator<MessageMetadata> {
    /**
     * Message decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {string} msgType the message handle type.
     * @param {Type<MessageHandle<MessageContext>>} [before] register this message handle before this handle.
     */
    (msgType: string, before?: Type<MessageHandle<MessageContext>>): ClassDecorator;

    /**
     * RegisterFor decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata?: MessageMetadata): ClassDecorator;
}

/**
 * Message decorator, for class. use to define the class as message handle register in global message queue.
 *
 * @Message
 */
export const Message: IMessageDecorator = createClassDecorator<MessageMetadata>('Message', (args: ArgsIterator) => {
    args.next<MessageMetadata>({
        match: (arg) => isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.msgType = arg;
        }
    });
    args.next<MessageMetadata>({
        match: (arg) => isClass(arg),
        setMetadata: (metadata, arg) => {
            metadata.before = arg;
        }
    });
}) as IMessageDecorator;
