import { TypeMetadata, createClassDecorator, Type, isClass, PatternMetadata } from '@tsdi/ioc';
import { IMessage } from '../messages/IMessageQueue';
import { MessageQueue } from '../messages/MessageQueue';
import { MessageContext } from '../messages/MessageContext';
import { MessageHandle } from '../messages/MessageHandle';

export type MessageDecorator = <TFunction extends Type<IMessage>>(target: TFunction) => TFunction | void;


/**
 * message metadata. use to define the class as message handle register in global message queue.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
export interface MessageMetadata extends TypeMetadata, PatternMetadata {
    /**
     * message parent.
     * default register in root message queue.
     * @type {boolean}
     * @memberof ModuleConfig
     */
    parent?: Type<MessageQueue<MessageContext>> | 'root' | 'none';
    /**
     * message handle regster in. use parent instead.
     * @deprecated
     */
    regIn?: Type<MessageQueue<MessageContext>> | 'root' | 'none';

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
export interface IMessageDecorator {
    /**
     * Message decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {Type<MessageQueue<MessageContext>>} [parent] the message reg in the message queue. default register in root message queue.
     * @param {Type<MessageHandle<MessageContext>>} [before] register this message handle before this handle.
     */
    (parent?: Type<MessageQueue<MessageContext>> | 'root' | 'none', before?: Type<MessageHandle<MessageContext>>): MessageDecorator;

    /**
     * RegisterFor decorator, for class. use to define the the way to register the module. default as child module.
     *
     * @RegisterFor
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata: MessageMetadata): MessageDecorator;
}

/**
 * Message decorator, for class. use to define the class as message handle register in global message queue.
 *
 * @Message
 */
export const Message: IMessageDecorator = createClassDecorator<MessageMetadata>('Message',
    [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isClass(arg) && ctx.args.length > 0) {
                ctx.metadata.parent = arg;
                ctx.next(next);
            }
        },
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isClass(arg)) {
                ctx.metadata.before = arg;
                // ctx.next(next);
            }
        }
    ], meta => {
        meta.singleton = true;
        // default register in root.
        if (!meta.parent) {
            meta.parent = meta.regIn || 'root';
        }
        meta.regIn = undefined;
    }) as IMessageDecorator;
