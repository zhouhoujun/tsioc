import {
    MetadataExtends, createClassDecorator, ArgsIteratorAction, isUndefined, ClassType,
    TypeMetadata, PatternMetadata, isClass, lang, Type, isFunction, Token
} from '@tsdi/ioc';
import { IStartupService } from './services/StartupService';
import { ModuleConfigure } from './modules/ModuleConfigure';
import { IMessage } from './messages/IMessageQueue';
import { MessageQueue } from './messages/queue';
import { MessageContext } from './messages/ctx';
import { MessageHandle } from './messages/handle';

export type BootDecorator = <TFunction extends ClassType<IStartupService>>(target: TFunction) => TFunction | void;

/**
 * Boot metadata.
 *
 * @export
 * @interface BootMetadata
 * @extends {ClassMetadata}
 */
export interface BootMetadata extends TypeMetadata, PatternMetadata {
    /**
     * the startup service dependencies.
     */
    deps?: ClassType<IStartupService>[];
    /**
     * this service startup before the service, or at first
     */
    before?: ClassType<IStartupService> | 'all';
    /**
     * this service startup after the service, or last.
     */
    after?: ClassType<IStartupService> | 'all';
}

/**
 * Boot decorator, use to define class as statup service when bootstrap application.
 *
 * @export
 * @interface IBootDecorator
 * @template T
 */
export interface IBootDecorator {
    /**
     * Boot decorator, use to define class as statup service when bootstrap application.
     *
     * @Boot
     *
     * @param {BootMetadata} [metadata] bootstrap metadate config.
     */
    (metadata?: BootMetadata): BootDecorator;

    /**
     * Boot decorator, use to define class as statup service when bootstrap application.
     **/
    (target: Type): void;
}

/**
 * create type builder decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {ArgsIteratorAction<T>[]} [actions]
 * @param {MetadataExtends<T>} [metaExtends]
 * @returns {IBootDecorator}
 */
export function createBootDecorator<T extends BootMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metaExtends?: MetadataExtends<T>): IBootDecorator {

    return createClassDecorator<T>(name,
        actions,
        meta => {
            if (metaExtends) {
                metaExtends(meta as T);
            }
            if (isUndefined(meta.singleton)) {
                meta.singleton = true;
            }
            return meta;
        }) as IBootDecorator;
}


/**
 * Boot decorator, use to define class as statup service when bootstrap application.
 *
 * @Boot
 */
export const Boot: IBootDecorator = createBootDecorator<BootMetadata>('Boot');



/**
 * DI module metadata.
 *
 * @export
 * @interface DIModuleMetadata
 * @extends {ModuleConfigure}
 * @extends {ClassMetadata}
 */
export interface DIModuleMetadata extends ModuleConfigure {
    /**
     * custom decorator type.
     *
     * @type {string}
     * @memberof DIModuleMetadata
     */
    decorType?: string;
}


/**
 * DIModule decorator, use to define class as DI Module.
 *
 * @export
 * @interface IDIModuleDecorator
 * @template T
 */
export interface IDIModuleDecorator<T extends DIModuleMetadata> {
    /**
     * DIModule decorator, use to define class as DI Module.
     *
     * @DIModule
     *
     * @param {T} [metadata] bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}

/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [actions]
 * @param {MetadataExtends<T>} [metaExt]
 * @returns {IDIModuleDecorator<T>}
 */
export function createDIModuleDecorator<T extends DIModuleMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metaExt?: MetadataExtends<T>): IDIModuleDecorator<T> {

    return createClassDecorator<DIModuleMetadata>(name,
        actions,
        meta => {
            if (metaExt) {
                metaExt(meta as T);
            }

            if (!meta.name && isClass(meta.token)) {
                meta.name = lang.getClassName(meta.token);
            }
            meta.decorType = name;
        }) as IDIModuleDecorator<T>;
}

/**
 * DIModule Decorator, definde class as DI module.
 *
 * @DIModule
 */
export const DIModule: IDIModuleDecorator<DIModuleMetadata> = createDIModuleDecorator<DIModuleMetadata>('DIModule');



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


/**
 * bootstrap metadata.
 *
 * @export
 * @interface BootstrapMetadata
 * @extends {AppConfigure}
 */
export interface BootstrapMetadata extends ModuleConfigure {
    /**
     * module bootstrap token.
     *
     * @type {Token<T>}
     * @memberof AnnotationConfigure
     */
    bootstrap?: Token;

}


/**
 * Bootstrap decorator, use to define class is a task element.
 *
 * @export
 * @interface IBootstrapDecorator
 * @template T
 */
export interface IBootstrapDecorator<T extends BootstrapMetadata> {
    /**
     * Bootstrap decorator, use to define class as Application Bootstrap element.
     *
     * @Bootstrap
     *
     * @param {T} metadata bootstrap metadate config.
     */
    (metadata: T): ClassDecorator;
}


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [actions]
 * @param {MetadataExtends<T>} [metaExt]
 * @returns {IBootstrapDecorator<T>}
 */
export function createBootstrapDecorator<T extends BootstrapMetadata>(
    name: string,
    actions?: ArgsIteratorAction<T>[],
    metaExt?: MetadataExtends<T>): IBootstrapDecorator<T> {

    return createClassDecorator<BootstrapMetadata>(name, actions, (meta: T) => {
        if (metaExt) {
            metaExt(meta);
        }

        // static main.
        if (isClass(meta.type) && isFunction(meta.type['main'])) {
            setTimeout(() => {
                meta.type['main'](meta);
            }, 100);
        }
        return meta;
    }) as IBootstrapDecorator<T>;
}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IBootstrapDecorator<BootstrapMetadata> = createBootstrapDecorator<BootstrapMetadata>('Bootstrap');
