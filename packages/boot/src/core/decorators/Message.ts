import { TypeMetadata, ITypeDecorator, createClassDecorator, ArgsIterator, isNumber, Type, isString, isClass } from '@tsdi/ioc';
import { MessageHandle } from '../messages';

/**
 * register for metadata.
 *
 * @export
 * @interface RegisterForMetadata
 * @extends {TypeMetadata}
 */
export interface MessageMetadata extends TypeMetadata {
    /**
     * set where this module to register. default as child module.
     *
     * @type {boolean}
     * @memberof ModuleConfig
     */
    msgType?: string;

    before?: Type<MessageHandle>;

    after?: Type<MessageHandle>;
}

/**
 * Message decorator.
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
     * @param {RegFor} regFor register module scope.
     */
    (msgType: string, before?: Type<MessageHandle>): ClassDecorator;

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
 * Message decorator, for class. use to define the class as root module for root conatiner only.
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
