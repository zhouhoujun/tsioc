import {
    createDecorator, DecoratorOption, isUndefined, ClassType,
    TypeMetadata, PatternMetadata, isClass, lang, Type, isFunction, Token, isString, isArray
} from '@tsdi/ioc';
import { IStartupService } from './services/StartupService';
import { ModuleConfigure } from './modules/configure';
import { IMessage } from './messages/IMessageQueue';
import { MessageQueue } from './messages/queue';
import { MessageContext } from './messages/ctx';
import { MessageHandle } from './messages/handle';
import { ModuleReflect } from './modules/reflect';

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
 * @param {DecoratorOption<T>} [options]
 * @returns {IBootDecorator}
 */
export function createBootDecorator<T extends BootMetadata>(name: string, options?: DecoratorOption<T>): IBootDecorator {
    options = options || {};
    const append = options?.append;
    const hd = options.classHandle;
    return createDecorator<T>(name, {
        actionType: 'annoation',
        ...options,
        classHandle: [
            (ctx, next) => {
                const reflect = ctx.reflect as ModuleReflect;
                reflect.annoType = 'boot';
                reflect.annoDecor = ctx.decor;
                reflect.annotation = ctx.matedata;
                return next();
            },
            ...hd ? (isArray(hd) ? hd : [hd]) : []
        ],
        append: (meta) => {
            if (append) {
                append(meta);
            }
            if (isUndefined(meta.singleton)) {
                meta.singleton = true;
            }
            return meta;
        }
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
 * @param {DecoratorOption<T>} [options]
 * @returns {IDIModuleDecorator<T>}
 */
export function createDIModuleDecorator<T extends DIModuleMetadata>(name: string, options?: DecoratorOption<T>): IDIModuleDecorator<T> {
    options = options || {};
    const append = options.append;
    const hd = options.classHandle;
    return createDecorator<DIModuleMetadata>(name, {
        ...options,
        classHandle: [
            (ctx, next) => {
                const reflect = ctx.reflect as ModuleReflect;
                reflect.annoType = 'module';
                reflect.annoDecor = ctx.decor;
                reflect.annotation = ctx.matedata;
                return next();
            },
            ...hd ? (isArray(hd) ? hd : [hd]) : []
        ],
        append: (meta) => {
            if (append) {
                append(meta as T);
            }

            if (!meta.name && isClass(meta.token)) {
                meta.name = lang.getClassName(meta.token);
            }
        }
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
export const Message: IMessageDecorator = createDecorator<MessageMetadata>('Message', {
    actionType: 'annoation',
    actions: [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isClass(arg) || isString(arg)) {
                ctx.metadata.parent = arg as any;
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
    ],
    append: (meta) => {
        meta.singleton = true;
        // default register in root.
        if (!meta.parent) {
            meta.parent = 'root';
        }
    }
});


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
 * @param {DecoratorOption<T>} [options]
 * @returns {IBootstrapDecorator<T>}
 */
export function createBootstrapDecorator<T extends BootstrapMetadata>(name: string, options?: DecoratorOption<T>): IBootstrapDecorator<T> {

    return createDecorator<BootstrapMetadata>(name, {
        classHandle: (ctx, next) => {
            const reflect = ctx.reflect as ModuleReflect;
            reflect.annoType = 'module';
            reflect.annoDecor = ctx.decor;
            reflect.annotation = ctx.matedata;
            // static main.
            if (isClass(ctx.decorType) && isFunction(ctx.decorType['main'])) {
                setTimeout(() => {
                    ctx.decorType['main'](ctx.matedata);
                }, 500);
            }
            return next();
        },
        ...options
    }) as IBootstrapDecorator<T>;
}

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
export const Bootstrap: IBootstrapDecorator<BootstrapMetadata> = createBootstrapDecorator<BootstrapMetadata>('Bootstrap');
