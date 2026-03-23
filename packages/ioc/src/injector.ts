import { OnDestroy, Destroyable, DestroyCallback } from './destroy';
import { AbstractType } from './types';
import { ClassProvider, ExistingProvider, FactoryProvider, Provider, ValueProvider } from './providers';
import { Token, InjectFlags, token } from './tokens';
import { Abstract } from './metadata/fac';
import { ProvidedInMetadata } from './metadata/meta';
import { isArray } from './utils/chk';
import { InvokeProviders } from './context';
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
    abstract getParent(): Injector;
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
     * set value.
     *
     * 设置上下文中标记指令的实例值
     * @param token token
     * @param value value for the token.
     */
    abstract setValue<T>(token: Token<T>, value: T): this;
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
