import { Type } from '../types';
import { isString, isNumber, isArray } from '../utils/lang';
import { isToken, Token, ProvideToken, Provider } from '../tokens';
import { IIocContainer } from '../IIocContainer';
import {
    ClassMetadata, AutorunMetadata, AutoWiredMetadata, InjectMetadata,
    InjectableMetadata, ParameterMetadata, ProvidersMetadata, RefMetadata
} from './metadatas';
import {
    createDecorator, createClassDecorator, ClassMethodDecorator, createClassMethodDecorator,
    createMethodPropParamDecorator, createParamPropDecorator, createParamDecorator, PropParamDecorator
} from './factory';

/**
 * Abstract decorator. define the class as abstract class.
 */
export interface IAbstractDecorator {
    /**
     * define class is abstract class.
     *
     * @param {T} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;
    /**
     * define class is abstract class.
     */
    (target: Type): void;
}

/**
 * Abstract decorator. define for class.
 *
 * @Abstract
 */
export const Abstract: IAbstractDecorator = createClassDecorator<ClassMetadata>('Abstract');

/**
 * AutoWired decoator.
 */
export interface IAutoWiredDecorator {
    /**
     * AutoWired decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token<T>} provider define provider to resolve value to the parameter or property.
     */
    (provider: Token): PropParamDecorator;
    /**
     * AutoWired decorator with providers for method.
     *
     * @param {Token<T>} provider the providers for the method.
     */
    (providers: Provider[]): MethodDecorator;
    /**
     * AutoWired decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     * @param {T} [metadata] define matadata map to resolve value to the parameter or property.
     */
    (metadata?: AutoWiredMetadata): PropParamDecorator;
    /**
     * AutoWired decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     */
    (target: object, propertyKey: string | symbol, parameterIndex?: number | TypedPropertyDescriptor<any>): void;
}

/**
 * AutoWired decorator, for property or param. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @AutoWired
 */
export const AutoWired: IAutoWiredDecorator = createMethodPropParamDecorator<AutoWiredMetadata>('AutoWired');

/**
 * inject decoator.
 */
export interface IInjectDecorator {
    /**
     * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     *
     * @param {Token<T>} provider define provider to resolve value to the parameter or property.
     */
    (provider: Token): PropParamDecorator;
    /**
     * Inject decorator with providers for method.
     *
     * @param {Token<T>} provider the providers for the method.
     */
    (providers: Provider[]): MethodDecorator;
    /**
     * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     * @param {T} [metadata] define matadata map to resolve value to the parameter or property.
     */
    (metadata?: InjectMetadata): PropParamDecorator;
    /**
     * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
     */
    (target: object, propertyKey: string | symbol, parameterIndex?: number | TypedPropertyDescriptor<any>): void;
}

/**
 * Inject decorator, for property or param, use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Inject
 */
export const Inject: IInjectDecorator = createParamPropDecorator<InjectMetadata>('Inject');


/**
 * Parameter decorator.
 *
 * @export
 * @interface IParamDecorator
 */
export interface IParamDecorator {
    /**
     * define parameter decorator with param.
     *
     * @param {Token} provider define provider to resolve value to the parameter.
     */
    (provider: Token): ParameterDecorator;
    /**
     * define parameter decorator with metadata map.
     * @param {T} [metadata] define matadata map to resolve value to the parameter.
     */
    (metadata?: ParameterMetadata): ParameterDecorator;
    /**
     * define paramete decorator.
     */
    (target: object, propertyKey: string | symbol, parameterIndex: number): void;
}

/**
 * param decorator, define for parameter. use to auto wried type instance or value to the instance of one class with the decorator.
 *
 * @Param
 */
export const Param: IParamDecorator = createParamDecorator<ParameterMetadata>('Param');


/**
 * Injectable decorator
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<InjectableMetadata>}
 */
export interface IInjectableDecorator {
    /**
     * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
     *
     * @Injectable
     *
     * @param {InjectableMetadata} [metadata] metadata map.
     */
    (metadata?: InjectableMetadata): ClassDecorator;

    /**
     * Injectable decorator setting with params.
     *
     * @param {ProvideToken} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provide: ProvideToken<any>): ClassDecorator;

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     */
    (provide: Token, alias: string): ClassDecorator;

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {Token} [refTarget]  define the class as service of target.
     */
    (provide: Token, alias: string, refTarget: Token): ClassDecorator;

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     * @param {Token} [refTarget]  define the class as service of target.
     */
    (provide: Token, alias: string, singlton: boolean, refTarget: Token): ClassDecorator;

    /**
     * Injectable decorator setting with params.
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} [alias] define this class provider with alias for provide.
     * @param {boolean} [singlton] define this class as singlton.
     * @param {number} [cache]  define class cahce expris when is not singlton.
     * @param {Token} [refTarget]  define the class as service of target.
     */
    (provide: Token, alias: string, cache: number, refTarget: Token): ClassDecorator;

    /**
     * Injectable decorator.
     */
    (target: Type): void;
}


/**
 * Injectable decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @Injectable
 */
export const Injectable: IInjectableDecorator = createClassDecorator<InjectableMetadata>('Injectable', true);


/**
 * @Providers decorator, for class. use to define the class as service of target.
 *
 * @Providers
 *
 * @export
 * @interface IProvidersDecorator
 * @extends {IClassDecorator<ProvidersMetadata>}
 */
export interface IProvidersDecorator {
    /**
     * Providers decorator, for class. use to add ref service to the class.
     *
     * @Providers
     *
     * @param {(Registration | symbol | string)} providers provider reference service to target.
     */
    (providers: Provider[]): ClassMethodDecorator;

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
export const Providers: IProvidersDecorator = createDecorator<ProvidersMetadata>('Providers', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isArray(arg)) {
            ctx.metadata.providers = arg;
            ctx.next(next);
        }
    }
]) as IProvidersDecorator;



/**
 * Refs decorator, for class. use to define the class as service of target.
 *
 * @Refs
 *
 * @export
 * @interface IRefToDecorator
 * @extends {IClassDecorator<RefMetadata>}
 */
export interface IRefsDecorator {
    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {Token} target reference to target token.
     */
    (target: Token): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {Token} target reference to target token.
     * @param {Token} provide define this class ref provider for provide.
     * @param {string} [alias] define this class ref provider with alias for provide.
    */
    (target: Token, provide: Token, alias?: string): ClassDecorator;

    /**
     * Refs decorator, for class. use to define the class as service of target.
     *
     * @Refs
     *
     * @param {RefMetadata} [metadata] metadata map.
     */
    (metadata: RefMetadata): ClassDecorator;
}

/**
 * Refs decorator, for class. use to define the class as service of target.
 *
 * @Refs
 */
export const Refs: IRefsDecorator = createDecorator<RefMetadata>('Refs', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isToken(arg)) {
            ctx.metadata.refs = { target: arg };
            ctx.next(next);
        }
    },
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isToken(arg)) {
            ctx.metadata.refs.provide = arg;
            ctx.next(next);
        }
    },
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg)) {
            ctx.metadata.refs.alias = arg;
            ctx.next(next);
        }
    }
]) as IRefsDecorator;


/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton
 *
 * @export
 * @interface ISingletonDecorator
 * @extends {IClassDecorator<ClassMetadata>}
 */
export interface ISingletonDecorator {
    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton
     *
     * @param {ProvideToken<any>} provide define this class provider for provide.
     */
    (provide: ProvideToken<any>): ClassDecorator;

    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton
     *
     * @param {Token} provide define this class provider for provide.
     * @param {string} alias define this class provider with alias for provide.
     */
    (provide: Token, alias: string): ClassDecorator;

    /**
     * Singleton decorator, for class. use to define the class is singleton.
     *
     * @Singleton
     *
     * @param {ClassMetadata} [metadata] metadata map.
     */
    (metadata?: ClassMetadata): ClassDecorator;

    /**
     * Singleton decorator.
     */
    (target: Type): void;
}

/**
 * Singleton decorator, for class. use to define the class is singleton.
 *
 * @Singleton
 */
export const Singleton: ISingletonDecorator = createClassDecorator<ClassMetadata>('Singleton', null, (metadata) => {
    metadata.singleton = true;
    return metadata;
}, true) as ISingletonDecorator;



/**
 *  ioc extend inteface.
 */
export interface IocExtentd {
    setup(container: IIocContainer);
}

/**
 * Ioc Extentd decorator.
 */
export type IocExtentdDecorator = <TFunction extends Type<IocExtentd>>(target: TFunction) => TFunction | void;

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt
 */
export interface IocExtDecorator {
    /**
     * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
     *
     * @IocExt
     *
     * @param {string} [autorun] auto run special method.
     */
    (): IocExtentdDecorator;

    /**
     * IocExt decorator.
     */
    (target: Type): void;
}

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt
 */
export const IocExt: IocExtDecorator = createClassDecorator<AutorunMetadata>('IocExt', null,
    (metadata) => {
        metadata.autorun = 'setup';
        metadata.singleton = true;
        metadata.regIn = 'root';
        return metadata;
    }) as IocExtDecorator;



/**
 * autorun decorator inteface
 *
 * @export
 * @interface IAutorunDecorator
 * @extends {IClassMethodDecorator<AutorunMetadata>}
 */
export interface IAutorunDecorator {
    /**
     * Autorun decorator, for class.  use to define the class auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     */
    (autorun: string): ClassDecorator;

    /**
     * Autorun decorator, for method.  use to define the method auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {string} [autorun] the special method name when define to class.
     */
    (order: number): MethodDecorator;

    /**
     * Autorun decorator, for class or method. use to define the class auto run (via a method or not) after registered.
     * @Autorun
     *
     * @param {AutorunMetadata} [metadata] metadata map.
     */
    (metadata?: AutorunMetadata): ClassMethodDecorator;


    /**
     * Autorun decorator.
     */
    (target: Type): void;
}

/**
 * Autorun decorator, for class or method.  use to define the class auto run (via a method or not) after registered.
 *
 * @Autorun
 */
export const Autorun: IAutorunDecorator = createClassMethodDecorator<AutorunMetadata>('Autorun', [
    (ctx, next) => {
        let arg = ctx.currArg;
        if (isString(arg) || isNumber(arg)) {
            if (isString(arg)) {
                ctx.metadata.autorun = arg;
                ctx.next(next);
            } else {
                ctx.metadata.order = arg;
                ctx.next(next);
            }
        }
    }
], (metadata) => {
    metadata.singleton = true;
    return metadata;
}) as IAutorunDecorator;
