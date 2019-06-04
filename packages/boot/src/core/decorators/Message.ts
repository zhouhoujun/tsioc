import { TypeMetadata, ITypeDecorator, createClassDecorator, ArgsIterator, Type, isClass, isUndefined } from '@tsdi/ioc';
import { MessageHandle, MessageContext, MessageQueue } from '../messages';

/**
 * message metadata. use to define the class as message handle register in global message queue.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
export interface MessageMetadata extends TypeMetadata {
    /**
     * is singleton or not.
     *
     * @type {boolean}
     * @memberof ClassMetadata
     */
    singleton?: boolean;
    /**
     * message type.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    regIn?: Type<MessageQueue<MessageContext>>;

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
     * @param {Type<MessageQueue<MessageContext>>} regIn the message reg in the message queue.
     * @param {Type<MessageHandle<MessageContext>>} [before] register this message handle before this handle.
     */
    (regIn: Type<MessageQueue<MessageContext>>, before?: Type<MessageHandle<MessageContext>>): ClassDecorator;

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
        match: (arg) => isClass(arg),
        setMetadata: (metadata, arg) => {
            metadata.regIn = arg;
        }
    });
    args.next<MessageMetadata>({
        match: (arg) => isClass(arg),
        setMetadata: (metadata, arg) => {
            metadata.before = arg;
        }
    });
}, meta => {
    if (isUndefined(meta.singleton)) {
        meta.singleton = true;
    }
}) as IMessageDecorator;
