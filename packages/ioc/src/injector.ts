import { OnDestroy, Destroyable, DestroyCallback } from './destroy';
import { AbstractType, Type } from './types';
import { ClassProvider, DynamicProvider, ExistingProvider, FactoryProvider, ModuleType, Provider, StaticProvider, ValueProvider } from './providers';
import { Token, InjectFlags, token } from './tokens';
import { Abstract } from './metadata/fac';
import { ClassRef } from './metadata/class';
import { ProvidedInMetadata } from './metadata/meta';
import { isArray } from './utils/chk';
import { InvocationContext, InvokeOptions, InvokeProviders } from './context';
import { Exception } from './exception';
import { Runtime } from './runtime';
import { Parameter } from './resolver';
import { RunContext } from './handlers/contexts';


export const RECORDS = Symbol('RECORDS');

/**
 * injector.
 * implements {@link Destroyable}
 * 
 * IoC 容器，注入器
 */
@Abstract()
export abstract class Injector implements Destroyable, OnDestroy {
    /**
     * 是否静态容器。
     */
    readonly isStatic?: boolean;

    /**
     * records of providers.
     * 
     * 容器提供者记录
     */
    abstract readonly [RECORDS]: Map<Token<any>, InjectorRecord>;

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
     * @param {RunContext} context resolve context. type of {@link RunContext}, use to resolve with token.
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags, context?: RunContext): T;

    /**
     * resolve parameter of targetType.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Parameter<T>} parameter the resolve parameter {@link Parameter}.
     * @param {RunContext} context the resolver context.
     * 
     * @returns {T}
     */
    abstract resolve<T>(parameter: Parameter<T>, context?: RunContext): T;
    /**
     * resolve token in context.
     * 
     * 解析上下文中标记指令的实例值
     * @param token
     * @param {RunContext} context the resolver context.
     */
    abstract resolve<T>(token: Token<T>, context?: RunContext): T;
    /**
     * resolve token in context.
     * 
     * 解析上下文中标记指令的实例值
     * @param token
     * @param flags InjectFalgs 
     */
    abstract resolve<T>(token: Token<T>, falgs?: InjectFlags, context?: RunContext): T;
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

@Abstract()
export abstract class EnvironmentInjector extends Injector {

}


/**
 * ROOT injector instance token of self.
 */
export const INJECTOR: Token<Injector> = token<Injector>('DI_INJECTOR');

/**
 * appliction platform injector token.
 */
export const CONTAINER: Token<Injector> = token<Injector>('CONTAINER', 'platform');


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
     * @param {Injector} context injector type of {@link Injector}, use to resolve with token.
     * @returns {T}
     */
    resolve<T>(token: Token<T>, context?: Injector): T;
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
    // /**
    //  * get token implement class type.
    //  *
    //  * @template T
    //  * @param {Token<T>} token
    //  * @param {InjectFlags} flags get token strategy.
    //  * @returns {AbstractType<T>}
    //  */
    // getTokenProvider<T>(token: Token<T>, flags?: InjectFlags): AbstractType<T>;
    /**
     * cache instance.
     * @param token 
     * @param instance 
     * @param expires 
     */
    cache<T>(token: Token<T>, instance: T, expires: number): this;
    /**
     * inject provider
     * @param provider 
     */
    provider(provider: StaticProvider | DynamicProvider): this;
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
export function createInjector(providers?: Provider[]): EnvironmentInjector;
/**
 * create injector.
 * @param parent 
 * @param providers 
 * @param scope 
 */
export function createInjector(parent: Injector, providers?: Provider[], scope?: AbstractType | 'platform' | 'root' | 'static'): Injector;
/**
 * create injector with option.
 * @param options 
 */
export function createInjector(parent: Injector, options?: InvokeProviders, scope?: AbstractType | 'static'): Injector;
export function createInjector(
    parentOrPds?: Provider[] | Injector,
    pdsOrOpts?: Provider[] | InvokeProviders,
    scope?: InjectorScope): Injector {
    if (!parentOrPds || isArray(parentOrPds)) {
        return INJECT_IMPL.createRoot(parentOrPds);
    }

    return isArray(pdsOrOpts) ? INJECT_IMPL.create(parentOrPds, pdsOrOpts, scope as AbstractType | 'root' | 'static') : INJECT_IMPL.createByOptions(parentOrPds, pdsOrOpts, scope as AbstractType | 'static');
}



/**
 * injector factory implement.
 */
export const INJECT_IMPL = {

    createRoot(providers?: Provider[]): EnvironmentInjector {
        throw new Exception('not implemented.')
    },
    /**
     * create injector
     * @param parent 
     * @param providers 
     * @param scope 
     */
    create(parent: Injector, providers?: Provider[], scope?: AbstractType | 'root' | 'static'): Injector {
        throw new Exception('not implemented.')
    },

    /**
     * create injector
     * @param parent
     * @param options 
     * @param scope 
     */
    createByOptions(parent: Injector, options?: InvokeProviders, scope?: AbstractType | 'static'): Injector {
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
export type ProviderOption<T = any> = ClassProvider<T> | ValueProvider<T> | ExistingProvider<T> | FactoryProvider<T>;

/**
 * register option.
 */
export type RegisterOption<T = any> = TypeOption<T> | ProviderOption<T>;



/**
 * injector scope.
 */
export type InjectorScope = AbstractType | 'platform' | 'root' | 'static';



export interface MethodFunc extends Function, TypedPropertyDescriptor<any> {
}
/**
 * method type.
 */
export type MethodType<T> = string | symbol | ((tag: T) => MethodFunc);

export type RecordFactory<T = any> = (context?: RunContext, flags?: InjectFlags) => T | null;

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
    factory?: RecordFactory<T>;

    /**
     * 预创建的值或占位符
     */
    value?: T | null | {};

    /**
     * 多提供者的依赖数组
     */
    multi?: any[];

    /**
     * is static or not.
     */
    stati?: boolean;

    /**
     * cache expires.
     */
    expires?: number;

    onRegister?: () => void;
}
