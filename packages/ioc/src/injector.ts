import { OnDestroy, Destroyable, DestroyCallback } from './destroy';
import { AbstractType, Type } from './types';
import { ClassProvider, ExistingProvider, FactoryProvider, ModuleType, Provider, ValueProvider } from './providers';
import { Token, InjectFlags } from './tokens';
import { Abstract } from './metadata/fac';
import { ClassRef } from './metadata/class';
import { ProvidedInMetadata } from './metadata/meta';
import { isArray } from './utils/chk';
import { InvocationContext, InvokeOptions } from './context';
import { Exception } from './exception';
import { Runtime } from './runtime';

/**
 * injector.
 * implements {@link Destroyable}
 * 
 * IoC 容器，注入器
 */
@Abstract()
export abstract class Injector implements Destroyable, OnDestroy {

    /**
     * injector scope.
     * 
     * 容器范围
     */
    readonly scope?: InjectorScope;
    /**
     * init inject ready.
     */
    abstract get ready(): Promise<void>;
    /**
     * parent injector.
     * 
     * 上级容器。
     */
    abstract getParent(): Injector | null;
    /**
     * get runtime.
     * 
     * 容器运行环境
     */
    abstract getRuntime(): Runtime;
    /**
     * get inject operator.
     * 
     * 获取注入器操作器。
     */
    abstract getInject(): InjectOperator;
    /**
     * has register.
     * 
     * 标记令牌是否已注册。
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
     * 获取标记令牌的实例。
     * @template T
     * @param {Token<T>} token token id {@link Token}.
     * @param {T} notFoundValue not found token, return this value.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @param {Injector} context invocation context. type of {@link Injector}, use to resolve with token.
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags, raise?: Injector): T;
    
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

}

/**
 * inject operator.
 */
export interface InjectOperator {
    /**
     * set gloabl singleton.
     * 
     * 设置标记令牌的实例，并设置为全局单例。
     * 
     * @param token provide key
     * @param value singleton vaule
     */
    setSingleton<T>(token: Token<T>, value: T): this;

    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {Provider[]} providers the providers to resolve with token. array of {@link Provider}.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, providers?: Provider[]): T;
    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {option} option the option of type {@link ResolverOption}, use to resolve with token.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, option?: InvokeOptions): T;
    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {InvocationContext} context invocation context type of {@link InvocationContext}, use to resolve with token.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, context?: InvocationContext): T;
    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the resolve token {@link Token}.
     * @param {...Provider[]} providers the providers {@link Provider} to resolve with token.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, ...providers: Provider[]): T;

    /**
     * set value.
     * 
     * 设置标记令牌的实例，并设置为静态值。
     * 
     * @param token provide key
     * @param value the vaule provider for the token.
     * @param provider the value type.
     */
    setValue<T>(token: Token<T>, value: T, provider?: AbstractType<T>): this;
    /**
     * get token implement class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {InjectFlags} flags get token strategy.
     * @returns {AbstractType<T>}
     */
    getTokenProvider<T>(token: Token<T>, flags?: InjectFlags): AbstractType<T>;
    /**
     * cache instance.
     * @param token 
     * @param instance 
     * @param expires 
     */
    cache<T>(token: Token<T>, instance: T, expires: number): this;
    /**
     * inject providers
     * 
     * 注入提供标记指令
     * @param providers
     */
    inject(providers: Provider | Provider[]): this;
    /**
     * inject providers.
     *
     * 注入提供标记指令
     * @param {...Provider[]} providers
     * @returns {this}
     */
    inject(...providers: Provider[]): this;
    /**
     * use modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {this}
     */
    use(modules: ModuleType[]): Type<any>[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    use(...modules: ModuleType[]): Type<any>[];
    /**
     * async use modules.
     * @param modules 
     */
    useAsync(modules: ModuleType[]): Promise<Type[]>;
    /**
     * async use modules.
     * @param modules 
     */
    useAsync(...modules: ModuleType[]): Promise<Type[]>;
    /**
     * register types.
     * 
     * 注册类
     * 
     * @param {Type<any>[]} types class type array.
     */
    register(types: (Type | RegisterOption)[]): this;
    /**
     * register types.
     * 
     * 注册类
     * @param types class type params.
     */
    register(...types: (Type | RegisterOption)[]): this;
    /**
     * unregister the token
     *
     * 注销标记指令
     * @template T
     * @param {Token<T>} token
     * @returns {this} this self.
     */
    unregister<T>(token: Token<T>): this;
    /**
     * invoke method.
     * 
     * 调用类方法
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {T} [instance] instance of target type.
     * @param {...Provider[]} providers ...params of {@link Provider}.
     * @returns {TR} the returnning of invoked method.
     */
    invoke<T, TR = any>(target: T | AbstractType<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    /**
     * invoke method.
     *
     * 调用类方法
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {Provider[]} providers array of {@link Provider}.
     * @returns {TR} the returnning of invoked method.
     */
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, providers: Provider[]): TR;
    /**
     * invoke method.
     *
     * 调用类方法
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {InvokeOptions} option ivacation arguments, type of {@link InvokeOptions}.
     * @returns {TR} the returnning of invoked method.
     */
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
    /**
     * invoke method.
     * 
     * 调用类方法
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance
     * @param {MethodType} propertyKey method name.
     * @param {InvocationContext} context ivacation context.
     * @returns {TR} the returnning of invoked method.
     */
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
}

/**
 * object is provider map or not.
 *
 * @export
 * @param {object} target
 * @returns {target is Injector}
 */
export function isInjector(target: any): target is Injector {
    return INJECT_IMPL.isInjector(target);
}


/**
 * create platform injector.
 * @param providers
*/
export function createInjector(providers?: Provider[]): Injector;
/**
 * create injector.
 * @param providers 
 * @param parent 
 * @param scope 
 */
export function createInjector(parent: Injector, scope?: InjectorScope): Injector;
/**
 * create injector.
 * @param providers 
 * @param parent 
 * @param scope 
 */
export function createInjector(providers: Provider[] | undefined, parent: Injector, scope?: InjectorScope): Injector;
/**
 * create injector with option.
 * @param options 
 */
export function createInjector(options: { providers: Provider[], parent?: Injector, scope?: InjectorScope }): Injector;
export function createInjector(
    options: Provider[] | Injector | { providers: Provider[], parent?: Injector, scope?: InjectorScope } | undefined,
    parent?: Injector | InjectorScope, scope?: InjectorScope): Injector {
    if (!options) {
        options = []
    }
    return isArray(options) ? INJECT_IMPL.create(options, parent as Injector, scope) :
        (isInjector(options) ? INJECT_IMPL.create(undefined, options, parent as InjectorScope) : INJECT_IMPL.create(options.providers, options.parent, options.scope))
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
    create(providers?: Provider[], parent?: Injector, scope?: InjectorScope): Injector {
        throw new Exception('not implemented.')
    },

    isInjector(target: any): boolean {
        throw new Exception('not implemented.')
    }
};


/**
 * instance factory.
 */
export type Factory<T = any> = (...args: any[]) => T;
export type Resolve<T> = (injector: Injector) => T | null | undefined;
export type InstanceOf<T> = T | Resolve<T>;

/**
 * register option
 */
export interface RegOption<T = any> extends ProvidedInMetadata {
    provide?: Token<T>;
    injectorType?: boolean;
    regProvides?: boolean;
    singleton?: boolean;
    static?: boolean;
    declaration?: boolean
}

/**
 * type register option.
 */
export interface TypeOption<T = any> extends RegOption<T> {
    type: AbstractType<T>;
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
export type InjectorScope = AbstractType | 'platform' | 'root' | 'static';


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
    deps?: any[];
    /**
     * token provider type.
     */
    type?: AbstractType<T>;
    /**
     * is static for fn create once.
     */
    stic?: boolean;
    /**
     * cache value.
     */
    cache?: T;
    /**
     * cache expires.
     */
    expires?: number;
}

export interface MethodFunc extends Function, TypedPropertyDescriptor<any> {
}
/**
 * method type.
 */
export type MethodType<T> = string | symbol | ((tag: T) => MethodFunc);

/**
 * Injecor Record
 */
export interface InjectorRecord<T = any> {
    /**
     * 提供者的类型
     */
    type?: AbstractType<T>;
    /**
     * 工厂函数，用于创建实例
     */
    factory?: (() => T);
    
    /**
     * 预创建的值或占位符
     */
    value: T | null | {};
    
    /**
     * 多提供者的依赖数组
     */
    multi?: any[];
    /**
     * 是否为静态提供者
     */
    isStatic?: boolean;
    /**
     * cache expires.
     */
    expires?: number;
}