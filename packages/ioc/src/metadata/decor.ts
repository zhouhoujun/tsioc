import { ClassType, Type } from '../types';
import { isString, isArray } from '../utils/chk';
import { Token, getToken, InjectFlags } from '../tokens';
import {
    ClassMetadata, AutorunMetadata, AutoWiredMetadata, InjectMetadata, PatternMetadata,
    InjectableMetadata, ParameterMetadata, ProvidersMetadata, ProviderInMetadata
} from './meta';
import { ClassMethodDecorator, createDecorator, createParamDecorator, PropParamDecorator } from './fac';
import { ProviderType, StaticProvider } from '../providers';
import { Injector } from '../injector';
import { OperationArgumentResolver } from '../invoker';



/**
 * Autowired decoator.
 */
export interface Autowired {
    /**
     * Autowired decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token<T>} [provider] define provider to resolve value to the parameter or property.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provider?: Token, alias?: string): PropParamDecorator;
    /**
     * Autowired decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token} provider define provider to resolve value to the parameter or property.
     * @param option autowired option.
     */
    (provider: Token, option?: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Token;
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is mutil provider or not
         */
        mutil?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): PropParamDecorator;
    /**
     * Autowired decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param option autowired option.
     */
    (option: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Token;
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is mutil provider or not
         */
        mutil?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): PropParamDecorator;
    /**
     * Autowired decorator with providers for method.
     *
     * @param {ProviderType[]} [providers] the providers for the method.
     */
    (providers?: ProviderType[]): MethodDecorator;
}


/**
 * Autowired decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Autowired()
 */
export const Autowired: Autowired = createDecorator<AutoWiredMetadata>('Autowired', {
    props: (provider: ProviderType[] | Token, alias?: string | Record<string, any>) => {
        if (isArray(provider)) {
            return { providers: provider };
        } else if (alias) {
            return isString(alias) ? { provider: getToken(provider, alias) } : { provider: getToken(provider, alias.alias), ...alias, alias: undefined };
        } else {
            return { provider: provider };
        }
    }
});

/**
 * Autowired decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * alias of @Autowired()
 * 
 * @alias
 */
export const AutoWired = Autowired;

/**
 * inject decoator.
 */
export interface Inject {
    /**
     * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token<T>} [provider] define provider to resolve value to the parameter or property.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provider?: Token, alias?: string): PropParamDecorator;
    /**
     * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token} provider define provider to resolve value to the parameter or property.
     * @param option inject option.
     */
    (provider: Token, option?: {
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is mutil provider or not
         */
        mutil?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): PropParamDecorator;
    /**
     * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param option inject option.
     */
    (option: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Token;
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is mutil provider or not
         */
        mutil?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): PropParamDecorator;
    /**
     * Inject decorator with providers for method.
     *
     * @param {ProviderType[]} [providers] the providers for the method.
     */
    (providers?: ProviderType[]): MethodDecorator;
}

/**
 * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Inject()
 */
export const Inject: Inject = createDecorator<InjectMetadata>('Inject', {
    props: (provider: ProviderType[] | Token, alias?: string | Record<string, any>) => {
        if (isArray(provider)) {
            return { providers: provider };
        } else if (alias) {
            return isString(alias) ? { provider: getToken(provider, alias) } : { provider: getToken(provider, alias.alias), ...alias, alias: undefined };
        } else {
            return { provider };
        }
    }
});


/**
 * Parameter decorator.
 *
 * @export
 * @interface Param
 */
export interface Param {
    /**
     * Param decorator, define parameter decorator with param.
     *
     * @param {Token} provider define provider to resolve value to the parameter.
     */
    (provider?: Token, alias?: string): ParameterDecorator;
    /**
     * Param decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token} provider define provider to resolve value to the parameter or property.
     * @param option inject option.
     */
    (provider: Token, option?: {
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is mutil provider or not
         */
        mutil?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): ParameterDecorator;
    /**
     * Param decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param option inject option.
     */
    (option: {
        /**
         * define provider to resolve value to the parameter or property.
         */
        provider?: Token;
        /**
         * define this class provider with alias for provide.
         */
        alias?: string;
        /**
         * inject flags.
         */
        flags?: InjectFlags;
        /**
        * custom resolver to resolve the value for the property or parameter.
        */
        resolver?: OperationArgumentResolver;
        /**
         * is mutil provider or not
         */
        mutil?: boolean;
        /**
         * null able or not.
         */
        nullable?: boolean;
        /**
         * default value
         *
         * @type {any}
         */
        defaultValue?: any

    }): ParameterDecorator;
}

/**
 * param decorator, define for parameter. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Param()
 */
export const Param: Param = createParamDecorator<ParameterMetadata>('Param');

/**
 * Type of the Optional metadata.
 *
 * @publicApi
 */
export interface Optional {
    /**
     * Parameter decorator to be used on constructor parameters,
     * which marks the parameter as being an optional dependency.
     * The DI framework provides `null` if the dependency is not found.
     *
     * Can be used together with other parameter decorators
     * that modify how dependency injection operates.
     *
     * @usageNotes
     *
     * The following code allows the possibility of a `null` result
     */
    (): ParameterDecorator;
}

export const Optional: Optional = createParamDecorator('Optional', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags & InjectFlags.Optional;
        } else {
            meta.flags = InjectFlags.Optional;
        }
        return meta;
    }
});


/**
 * Type of the Self metadata.
 *
 * @publicApi
 */
export interface Self {
    /**
     * Parameter decorator to be used on constructor parameters,
     * which tells the DI framework to start dependency resolution from the local injector.
     *
     * Resolution works upward through the injector hierarchy, so the children
     * of this class must configure their own providers or be prepared for a `null` result.
     *
     * @usageNotes
     *
     * In the following example, the dependency can be resolved
     * by the local injector when instantiating the class itself, but not
     * when instantiating a child.
     */
    (): ParameterDecorator;
}

export const Self: Self = createParamDecorator('Self', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags & InjectFlags.Self;
        } else {
            meta.flags = InjectFlags.Self;
        }
        return meta;
    }
});


/**
 * Type of the SkipSelf metadata.
 *
 * @publicApi
 */
export interface SkipSelf {
    /**
     * Parameter decorator to be used on constructor parameters,
     * which tells the DI framework to start dependency resolution from the parent injector.
     * Resolution works upward through the injector hierarchy, so the local injector
     * is not checked for a provider.
     *
     * @usageNotes
     *
     * In the following example, the dependency can be resolved when
     * instantiating a child, but not when instantiating the class itself.
     *
     * @see `Self`
     * @see `Optional`
     *
     */
    (): ParameterDecorator;
}

/**
 * `SkipSelf` decorator and metadata.
 * 
 * @Annotation
 * @publicApi
 */
export const SkipSelf: SkipSelf = createParamDecorator('SkipSelf', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags & InjectFlags.SkipSelf;
        } else {
            meta.flags = InjectFlags.SkipSelf;
        }
        return meta;
    }
});

/**
 * Type of the Host metadata.
 *
 * @publicApi
 */
export interface Host {
    /**
     * Parameter decorator on a compose element provider parameter of a class constructor
     * that tells the DI framework to resolve the view by checking injectors of child
     * elements, and stop when reaching the host element of the current component.
     *
     * @usageNotes
     *
     * The following shows use with the `@Optional` decorator, and allows for a `null` result.
     */
    (): ParameterDecorator;
}

/**
 * Host decorator and metadata.
 * @Annotation
 * @publicApi
 */
export const Host: Host = createParamDecorator('Host', {
    appendProps: (meta) => {
        if (meta.flags) {
            meta.flags = meta.flags & InjectFlags.Host;
        } else {
            meta.flags = InjectFlags.Host;
        }
        return meta;
    }
});


/**
 * Injectable decorator
 *
 * @export
 * @interface Injectable
 */
export interface Injectable {

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} [provide] define this class provider for provide.
     * @param {PatternMetadata} [pattern] define this class pattern.
     */
    (provide?: Token, pattern?: PatternMetadata): ClassDecorator;

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     * @param {PatternMetadata} [pattern] define this class pattern.
     */
    (provide: Token, alias: string, pattern?: PatternMetadata): ClassDecorator;

    /**
     * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Injectable()
     *
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata: InjectableMetadata): ClassDecorator;
}


/**
 * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @Injectable()
 */
export const Injectable: Injectable = createDecorator<InjectableMetadata>('Injectable', {
    props: (provide: Token, arg2: any, arg3?: any) => {
        if (isString(arg2)) {
            return { provide: getToken(provide, arg2), ...arg3 }
        } else {
            return { provide, ...arg2 }
        }
    }
});


/**
 * @Providers decorator, for class. use to define the class as service of target.
 *
 * @Providers
 *
 * @export
 * @interface Providers
 */
export interface Providers {
    /**
     * Providers decorator, for class. use to add ref service to the class.
     *
     * @Providers
     *
     * @param {(Registration | symbol | string)} providers provider reference service to target.
     */
    (providers: ProviderType[]): ClassMethodDecorator;

    /**
     * Providers decorator, for class. use to add ref service to the class.
     *
     * @Providers
     *
     * @param {ProvidersMetadata} [metadata] metadata map.
     */
    (metadata: ProvidersMetadata): ClassMethodDecorator;
}

/**
 * Providers decorator, for class. use to add ref service to the class.
 *
 * @Providers
 */
export const Providers: Providers = createDecorator<ProvidersMetadata>('Providers', {
    props: (providers: StaticProvider[]) => ({ providers }),
});



/**
 * ProviderIn decorator, for class. use to define the class as service of target.
 *
 * @Refs
 *
 * @export
 * @interface ProviderIn
 */
export interface ProviderIn {
    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {ClassType} target reference to target token.
     */
    (target: ClassType): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {ClassType} target reference to target token.
     * @param {Token} provide define this class ref provider for provide.
     * @param {string} [alias] define this class ref provider with alias for provide.
    */
    (target: ClassType, provide: Token, alias?: string): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {ProviderInMetadata} [metadata] metadata map.
     */
    (metadata: ProviderInMetadata): ClassDecorator;
}

/**
 * Refs decorator, for class. use to define the class as service of target.
 *
 * @Refs
 */
export const ProviderIn: ProviderIn = createDecorator<ProviderInMetadata>('ProviderIn', {
    props: (target: ClassType, provide?: Token, alias?: string) => ({ target, provide: getToken(provide!, alias) }),
    design: {
        afterAnnoation: (ctx, next) => {
            let meta = ctx.reflect.class.getMetadata<ProviderInMetadata>(ctx.currDecor!);
            const type = ctx.type;
            ctx.injector.platform().setTypeProvider(meta.target, [{ provide: meta.provide || type, useClass: type }])
            return next();
        }
    }
});


export const Refs = ProviderIn;

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton()
 *
 * @export
 * @interface Singleton
 */
export interface Singleton {
    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton()
     *
     * @param {Token} provide define this class provider for provide.
     */
    (provide?: Token): ClassDecorator;

    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton()
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     */
    (provide: Token, alias: string): ClassDecorator;

    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton()
     *
     * @param {ClassMetadata} metadata metadata map.
     */
    (metadata: ClassMetadata): ClassDecorator;
}

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton()
 */
export const Singleton: Singleton = createDecorator<ClassMetadata>('Singleton', {
    props: (provide: Token, alias?: string) => ({ provide: getToken(provide, alias) }),
    appendProps: (meta) => {
        meta.singleton = true;
    }
});


/**
 *  ioc extend inteface.
 */
export interface IocExtentd {
    setup(Injector: Injector): void;
}

/**
 * Ioc Extentd decorator.
 */
export type IocExtentdDecorator = <TFunction extends Type<IocExtentd>>(target: TFunction) => TFunction | void;

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt()
 */
export interface IocExt {
    /**
     * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
     *
     * @IocExt()
     *
     * @param {string} [autorun] auto run special method.
     */
    (): IocExtentdDecorator;
}

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt()
 */
export const IocExt: IocExt = createDecorator<AutorunMetadata>('IocExt', {
    appendProps: (metadata) => {
        metadata.autorun = 'setup';
        metadata.singleton = true;
        metadata.providedIn = 'platform';
    }
});



/**
 * autorun decorator inteface
 *
 * @export
 * @interface Autorun
 */
export interface Autorun {
    /**
     * Autorun decorator, for class.  use to define the class auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     */
    (autorun: string): ClassDecorator;
    /**
     * Autorun decorator, for class or method. use to define the class auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {AutorunMetadata} [metadata] metadata map.
     */
    (metadata: AutorunMetadata): ClassMethodDecorator;

    /**
     * Autorun decorator, for method.  use to define the method auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     */
    (order?: number): MethodDecorator;
}

/**
 * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
 *
 * @Autorun
 */
export const Autorun: Autorun = createDecorator<AutorunMetadata>('Autorun', {
    props: (arg: string | number) => {
        if (isString(arg)) {
            return { autorun: arg };
        }
        return { order: arg }
    },
    appendProps: (meta) => {
        meta.singleton = true;
    }
});
