import { OnDestroy, Destroyable, DestroyCallback } from './destroy';
import { AbstractType, Type, TypeOf } from './types';
import { ClassProvider, ExistingProvider, FactoryProvider, ModuleType, Provider, ValueProvider } from './providers';
import { Token, InjectFlags } from './tokens';
import { Abstract } from './metadata/fac';
import { ClassRef } from './metadata/class';
import { ProvidedInMetadata } from './metadata/meta';
import { isArray } from './utils/chk';
import { Exception } from './exception';
import { Runtime } from './runtime';
import { InterceptorLike } from './handler';

/**
 * injector.
 * implements {@link Destroyable}
 * 
 * IoC 容器，注入器
 */
@Abstract()
export abstract class Injector implements Destroyable, OnDestroy {

    isResolve?: boolean;
    used?: boolean;

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
     * token size.
     * 
     * 已注册标记令牌长度。
     */
    abstract get size(): number;
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
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags, environment?: Injector): T;
    /**
     * resolve token in context.
     * 
     * 解析上下文中标记指令的实例值
     * @param token token id {@link Token}.
     * @param flags InjectFalgs 
     */
    abstract resolve<T>(token: Token<T>, falgs?: InjectFlags): T;
    /**
     * resolve token instance with token and param provider.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Token<T>} token the token to resolve.
     * @param {Injector} environment the environment injector to raise resove.
     * @returns {T}
     */
    abstract resolve<T>(token: Token<T>, environment?: Injector): T;
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
    abstract resolve<T>(token: Token<T>, providers?: Provider[]): T;
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
    abstract resolve<T>(token: Token<T>, option?: InjectorOptions): T;
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
    abstract resolve<T>(token: Token<T>, ...providers: Provider[]): T;
    /**
     * resolve the parameter value.
     * 
     * 解析调用参数
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @param target resolve parameter for target type. 
     * @returns the parameter value in this context.
     */
    abstract resolveArgument<T>(meta: Partial<Parameter<T>>, target?: AbstractType, failed?: (target: AbstractType, propertyKey: string) => void): T | null;

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
     * @param {InjectorOptions} option ivacation arguments, type of {@link InjectorOptions}.
     * @returns {TR} the returnning of invoked method.
     */
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InjectorOptions): TR;
    /**
     * invoke method.
     * 
     * 调用类方法
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance
     * @param {MethodType} propertyKey method name.
     * @param {Injector} environment ivacation context.
     * @returns {TR} the returnning of invoked method.
     */
    invoke<T, TR = any>(target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, environment?: Injector): TR;
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
 * token value pair.
 * 
 * 标记值键值对
 */
export type TokenValue<T = any> = [Token<T>, T];

/**
 * invoke providers.
 */
export interface InjectorOptions {
    /**
     * is resovle or not.
     */
    isResolve?: boolean;
    /**
     * token values.
     * 
     * 调用接口的标记值键值对
     */
    values?: TokenValue[];
    /**
     * custom resolvers.
     * 
     * 调用接口的参数解析器
     */
    resolvers?: TypeOf<ResolveInterceptorLike>[];
    /**
     * custom providers.
     * 
     * 调用接口的提供者
     */
    providers?: Provider[];
    /**
     * injector scope
     */
    scope?: InjectorScope;
}


export type ResolveInterceptorLike<TInput extends Parameter = Parameter, TContext extends Injector = Injector> = InterceptorLike<TInput, any, TContext>;


/**
 * parameter argument of an {@link OperationArgumentResolver}.
 * 
 * 调用参数。
 */
export interface Parameter<T = any> {
    /**
     * param name
     */
    name?: string;
    /**
     * param design type.
     */
    type?: AbstractType<T>;
    /**
     * method property key
     *
     * @type {string}
     */
    propertyKey: string;
    /**
     * this type provide from.
     *
     * @type {Token}
     * @memberof Provide
     */
    provider?: Token<T>;

    /**
     * is multi provider or not
     */
    multi?: boolean;

    /**
     * inject flags.
     */
    flags?: InjectFlags
    /**
     * custom resolver to resolve property or parameter.
     */
    resolver?: TypeOf<ResolveInterceptorLike>[];
    /**
     * null able or not.
     */
    nullable?: boolean;
    /**
     * default value
     *
     * @type {any}
     */
    defaultValue?: any;

}

/**
 * create injector with option.
 * @param options 
 */
export function createInjector(options?: InjectorOptions, parent?: Injector): Injector;
/**
 * create injector.
 * @param providers 
 * @param parent 
 * @param scope 
 */
export function createInjector(providers: Provider[], parent?: Injector, scope?: InjectorScope): Injector;
export function createInjector(
    arg1: Provider[] | Injector | InjectorOptions | undefined,
    parent?: Injector, scope?: InjectorScope): Injector {
    let options: InjectorOptions | undefined;
    if (isArray(arg1)) {
        options = { providers: arg1, scope };
    } else {
        options = arg1;
    }
    return INJECT_IMPL.create(options, parent)
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
    create(options?: InjectorOptions, parent?: Injector): Injector {
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
