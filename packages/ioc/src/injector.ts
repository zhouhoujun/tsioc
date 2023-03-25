import { OnDestroy, Destroyable, DestroyCallback } from './destroy';
import { ClassType, EMPTY, Modules, Type } from './types';
import { ClassProvider, ExistingProvider, FactoryProvider, ProviderType, StaticProvider, ValueProvider } from './providers';
import { Token, InjectFlags } from './tokens';
import { Abstract } from './metadata/fac';
import { Class } from './metadata/type';
import { ProvidedInMetadata } from './metadata/meta';
import { isArray } from './utils/chk';
import { InvocationContext, InvokeArguments } from './context';
import { Execption } from './execption';
import { Platform } from './platform';

/**
 * injector.
 * implements {@link Destroyable}
 */
@Abstract()
export abstract class Injector implements Destroyable, OnDestroy {
    /**
     * none poincut for aop.
     */
    static ƿNPT = true;

    readonly scope?: InjectorScope;
    /**
     * parent injector.
     */
    readonly parent?: Injector;
    /**
     * platform.
     */
    abstract platform(): Platform;
    /**
     * registered tokens.
     */
    abstract tokens(): Token<any>[];
    /**
     * token size.
     */
    abstract get size(): number;
    /**
     * has register.
     *
     * @template T
     * @param {Token<T>} token the token.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @returns {boolean}
     */
    abstract has<T>(token: Token<T>, flags?: InjectFlags): boolean;
    /**
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token token id {@link Token}.
     * @param {T} notFoundValue not found token, return this value.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags): T;
    /**
     * get token factory resolve instace in current.
     *
     * @template T
     * @param {Token<T>} token token id.
     * @param {InvocationContext} context invocation context. type of {@link InvocationContext}, use to resolve with token.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @param {T} notFoundValue not found token, return this value.
     * @returns {T} the token value.
     */
    abstract get<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags, notFoundValue?: T): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {option} option the option of type {@link ResolverOption}, use to resolve with token.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, option?: InvokeArguments): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {InvocationContext} context invocation context type of {@link InvocationContext}, use to resolve with token.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, context?: InvocationContext): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {ProviderType[]} providers the providers to resolve with token. array of {@link ProviderType}.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, providers?: ProviderType[]): T;
    /**
     * resolve token instance with token and param provider.
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {...ProviderType[]} providers the providers {@link ProviderType} to resolve with token.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, ...providers: ProviderType[]): T;

    /**
     * set value.
     * @param token provide key
     * @param value the vaule provider for the token.
     * @param provider the value type.
     */
    abstract setValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
    /**
     * set gloabl singleton.
     * @param token provide key
     * @param value singleton vaule
     */
    abstract setSingleton<T>(token: Token<T>, value: T): this;

    /**
     * get token implement class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {InjectFlags} flags get token strategy.
     * @returns {Type<T>}
     */
    abstract getTokenProvider<T>(token: Token<T>, flags?: InjectFlags): Type<T>;
    /**
     * cache instance.
     * @param token 
     * @param instance 
     * @param expires 
     */
    abstract cache<T>(token: Token<T>, instance: T, expires: number): this;
    /**
     * inject providers
     * @param providers
     */
    abstract inject(providers: ProviderType | ProviderType[]): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    abstract inject(...providers: ProviderType[]): this;
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    abstract use(modules: Modules[]): Type<any>[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    abstract use(...modules: Modules[]): Type<any>[];
    /**
     * register types.
     * @param {Type<any>[]} types class type array.
     */
    abstract register(types: (Type | RegisterOption)[]): this;
    /**
     * register types.
     * @param types class type params.
     */
    abstract register(...types: (Type | RegisterOption)[]): this;
    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this} this self.
     */
    abstract unregister<T>(token: Token<T>): this;
    /**
     * invoke method.
     * @template T
     * @param {(T | Type<T> | Class<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {T} [instance] instance of target type.
     * @param {...ProviderType[]} providers ...params of {@link ProviderType}.
     * @returns {TR} the returnning of invoked method.
     */
    abstract invoke<T, TR = any>(target: T | Type<T>, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | Class<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {ProviderType[]} providers array of {@link ProviderType}.
     * @returns {TR} the returnning of invoked method.
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | Class<T>, propertyKey: MethodType<T>, providers: ProviderType[]): TR;
    /**
     * invoke method.
     *
     * @template T
     * @param {(T | Type<T> | Class<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {InvokeArguments} option ivacation arguments, type of {@link InvokeArguments}.
     * @returns {TR} the returnning of invoked method.
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | Class<T>, propertyKey: MethodType<T>, option?: InvokeArguments): TR;
    /**
     * invoke method.
     * 
     * @template T
     * @param {(T | Type<T> | Class<T>)} target type of class or instance
     * @param {MethodType} propertyKey method name.
     * @param {InvocationContext} context ivacation context.
     * @returns {TR} the returnning of invoked method.
     */
    abstract invoke<T, TR = any>(target: T | Type<T> | Class<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;

    /**
     * injector has destoryed or not.
     */
    abstract get destroyed(): boolean;
    /**
    * destroy this.
    */
    abstract destroy(): void;
    /**
     * destroy hook.
     */
    abstract onDestroy(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback: DestroyCallback): void;

    /**
     * register provider.
     * @param platfrom 
     * @param provider 
     * @returns 
     */
    protected abstract processRegister(platform: Platform, def: Class, option?: TypeOption): void;

    /**
     * create injector.
     * @param providers 
     * @param parent 
     */
    static create(providers?: ProviderType[], parent?: Injector, scope?: InjectorScope): Injector;
    /**
     * create injector with option.
     * @param options 
     */
    static create(options: { providers: ProviderType[], parent?: Injector, scope?: InjectorScope }): Injector;
    static create(
        options: ProviderType[] | { providers: ProviderType[], parent?: Injector, scope?: InjectorScope } | undefined,
        parent?: Injector, scope?: InjectorScope): Injector {
        if (!options) {
            options = EMPTY
        }
        return isArray(options) ? INJECT_IMPL.create(options, parent, scope) :
            INJECT_IMPL.create(options.providers, options.parent, options.scope)
    }
}


/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is Injector {
    return target instanceof Injector
}

/**
* ioc container. 
*/
@Abstract()
export abstract class Container extends Injector { }

@Abstract()
export abstract class InjectorEvent {
    abstract emit(event: 'register' | 'registered' | 'resolved', ...data: any[]): any;
}


/**
 * injector factory implement.
 */
export const INJECT_IMPL = {
    /**
     * create injector
     * @param providers 
     * @param parent 
     * @param scope 
     */
    create(providers: ProviderType[], parent?: Injector, scope?: InjectorScope): Injector {
        throw new Execption('not implemented.')
    }
};


/**
 * instance factory.
 */
export type Factory<T = any> = (...args: any[]) => T;

/**
 * register option
 */
export interface RegOption<T = any> extends ProvidedInMetadata {
    provide?: Token<T>;
    injectorType?: boolean;
    regProvides?: boolean;
    singleton?: boolean;
}

/**
 * type register option.
 */
export interface TypeOption<T = any> extends RegOption<T> {
    type: Type<T>;
}

/**
 * provider option.
 */
export type ProviderOption<T = any> = ClassProvider | ValueProvider | ExistingProvider | FactoryProvider;

/**
 * register option.
 */
export type RegisterOption<T = any> = TypeOption<T> | ProviderOption<T>;

/**
 * fn type
 */
export const enum FnType {
    Cotr,
    Inj,
    Fac
}

/**
 * injector scope.
 */
export type InjectorScope = ClassType | 'platform' | 'root' | 'static' | 'configuration';

/**
 * injector scopes.
 */
export const enum Scopes {
    platform = 'platform',
    root = 'root',
    configuration = 'configuration',
    static = 'static'
}

export const enum OptionFlags {
    Optional = 1 << 4,
    CheckSelf = 1 << 5,
    CheckParent = 1 << 6,
    Default = CheckSelf | CheckParent
}

export interface DependencyRecord {
    token: any;
    options: OptionFlags;
}
/**
 * factory record.
 */
export interface FactoryRecord<T = any> {
    /**
     * use value for provide.
     *
     * @type {*}
     */
    value?: any;
    /**
     * factory.
     */
    fn?: Function;
    /**
     * fn type.
     */
    fy?: FnType;
    /**
     * deps.
     */
    deps?: DependencyRecord[];
    /**
     * token provider type.
     */
    type?: Type<T>;
    /**
     * is static for fn create once.
     */
    stic?: boolean;
    /**
     * cache value.
     */
    cache?: T;
    /**
     * last timer use the cache.
     */
    ltop?: number;
    /**
     * cache expires.
     */
    expires?: number;
    /**
     * unregister callback.
     */
    unreg?: () => void;
}

export interface MethodFunc extends Function, TypedPropertyDescriptor<any> {
}
/**
 * method type.
 */
export type MethodType<T> = string | ((tag: T) => MethodFunc);
