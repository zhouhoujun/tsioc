import { createContext, hasContextOptions, InvocationContext, InvokeOptions } from '../context';
import { Exception } from '../exception';
import { Empty, processInject, processProvider, processUse } from './resolve';
import { FactoryRecord, Injector, MethodType, RegisterOption } from '../injector';
import { ClassRef } from '../metadata/class';
import { getClassRef } from '../metadata/refl';
import { ModuleType, Provider } from '../providers';
import { InjectFlags, Token } from '../tokens';
import { AbstractType, Type } from '../types';
import { getType, isArray, isDefined } from '../utils/chk';
import { cleanObj, deepForEach, getTypeName, immediate } from '../utils/lang';
import { isPlainObject, isTypeObject } from '../utils/obj';


export function assertNotDestroyed(injector: Injector): void {
    if (injector.destroyed) {
        throw new Exception(`${getTypeName(injector)} has already been destroyed.`)
    }
}

export function getRecords(injector: Injector): Map<Token, FactoryRecord> {
    return (injector as Injector & { records: Map<Token, FactoryRecord> }).records;
}


export namespace Operator {
    /**
     * set gloabl singleton.
     * 
     * 设置标记令牌的实例，并设置为全局单例。
     * 
     * @param token provide key
     * @param value singleton vaule
     */
    export function setSingleton<T>(injector: Injector, token: Token<T>, value: T): void {
        injector.getRuntime().setSingleton(token, value, injector);
    }

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
    export function resolve<T>(injector: Injector,token: Token<T>, providers?: Provider[]): T;
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
    export function resolve<T>(injector: Injector,token: Token<T>, option?: InvokeOptions): T;
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
    export function resolve<T>(injector: Injector,token: Token<T>, context?: InvocationContext): T;
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
    export function resolve<T>(injector: Injector,token: Token<T>, ...providers: Provider[]): T;
    export function resolve<T>(injector: Injector,token: Token<T>, ...args: any[]) {
        if (!args.length) {
            return injector.get(token);
        }
        assertNotDestroyed(injector);
        let context: InvocationContext | undefined;
        const isResolve = true;
        let isCtx = false;
        if (args.length === 1) {
            const arg1 = args[0];
            if (arg1 instanceof InvocationContext) {
                context = arg1;
                isCtx = true;
            } else if (isArray(arg1)) {
                context = arg1.length ? createContext(injector, { isResolve, providers: arg1 }) : undefined;
            } else if (arg1.provide) {
                context = createContext(injector, { isResolve, providers: [arg1] });
            } else if (hasContextOptions(arg1)) {
                context = createContext(injector, { isResolve, ...arg1 });
            }
        } else {
            context = createContext(injector, { isResolve, providers: args });
        }

        const result = (context && !isCtx) ? context.resolve(token, InjectFlags.Resolve) : injector.get(token, null, InjectFlags.Resolve, context);

        if (context && !isCtx && !context.used) {
            immediate(() => context!.destroy());
        }
        return result;
    }

    /**
     * set value.
     * 
     * 设置标记令牌的实例，并设置为静态值。
     * 
     * @param token provide key
     * @param value the vaule provider for the token.
     * @param provider the value type.
     */
    export function setValue<T>(injector: Injector, token: Token<T>, value: T, type?: AbstractType<T> | undefined): void {
        assertNotDestroyed(injector);
        const records = getRecords(injector);
        const isp = records.get(token);
        if (isp) {
            isp.value = value;
            if (type) isp.type = type
        } else if (isDefined(value)) {
            records.set(token, type ? { value, type } : { value })
        }
    }

    /**
     * get token implement class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {InjectFlags} flags get token strategy.
     * @returns {AbstractType<T>}
     */
    export function getTokenProvider<T>(injector: Injector, token: Token<T>, flags = InjectFlags.Default): AbstractType<T> {
        assertNotDestroyed(injector);
        let type: AbstractType | undefined;
        const records = getRecords(injector);
        if (!(flags & InjectFlags.SkipSelf)) {
            const rd = records.get(token);
            type = rd?.type;
        }
        if (!type && !(flags & InjectFlags.Self)) {
            const parent = injector.getParent();
            type = parent ? getTokenProvider(parent, token, flags) : null!;
        }
        return type ?? null!
    }
    /**
     * cache token instance.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} cache
     * @param {number} expires cache expires time.
     * @returns {this}
     */
    export function cache<T>(injector: Injector, token: Token<T>, cache: T, expires: number): void {
        assertNotDestroyed(injector);
        const records = getRecords(injector);
        const pd = records.get(token);
        const ltop = Date.now();
        if (pd) {
            pd.cache = cache;
            pd.expires = ltop + expires
        } else {
            records.set(token, { cache, expires })
        }
    }

    /**
     * inject providers
     * 
     * 注入提供标记指令
     * @param providers
     */
    export function inject(injector: Injector, providers: Provider | Provider[]): void;
    /**
     * inject providers.
     *
     * 注入提供标记指令
     * @param {...Provider[]} providers
     * @returns {this}
     */
    export function inject(injector: Injector, ...providers: Provider[]): void;
    export function inject(injector: Injector, ...args: any[]): void {
        assertNotDestroyed(injector);
        processInject(injector, args);
    }

    /**
     * use modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {this}
     */
    export function use(injector: Injector, modules: ModuleType[]): Type<any>[];
    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     */
    export function use(injector: Injector, ...modules: ModuleType[]): Type<any>[];
    export function use(injector: Injector, ...args: any[]): Type<any>[] {
        const types: Type<any>[] = [];
        processUse(injector, args, types);
        return types
    }


    /**
     * async use modules.
     * @param modules 
     */
    export function useAsync(injector: Injector, modules: ModuleType[]): Promise<Type[]>;
    /**
     * async use modules.
     * @param modules 
     */
    export function useAsync(injector: Injector, ...modules: ModuleType[]): Promise<Type[]>;
    /**
     * async use modules.
     * @param modules 
     */
    export async function useAsync(injector: Injector, ...args: any[]): Promise<Type[]> {
        const types: Type<any>[] = [];
        await processUse(injector, args, types);
        return types;
    }


    /**
     * register types.
     * 
     * 注册类
     * 
     * @param {Type<any>[]} types class type array.
     */
    export function register(injector: Injector, types: (Type | RegisterOption)[]): void;
    /**
     * register types.
     * 
     * 注册类
     * @param types class type params.
     */
    export function register(injector: Injector, ...types: (Type | RegisterOption)[]): void;
    export function register(injector: Injector, ...args: any[]): void {
        assertNotDestroyed(injector);
        deepForEach(args, t => {
            processProvider(injector, t)
        });
    }

    /**
     * unregister the token
     *
     * 注销标记指令
     * @template T
     * @param {Token<T>} token
     * @returns {this} this self.
     */
    export function unregister<T>(injector: Injector, token: Token<T>): void {
        assertNotDestroyed(injector);
        const records = getRecords(injector);
        const isp = records?.get(token);
        if (isp) {
            records.delete(token);
            if (isp.type) injector.getRuntime().clearTypeProvider(isp.type);
            cleanObj(isp)
        }
    }
    
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
    export function invoke<T, TR = any>(injector: Injector, target: T | AbstractType<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
    /**
     * invoke method.
     *
     * 调用类方法
     * @deprecated  use `ReflectiveRef` instead.
     * @template T
     * @param {(T | AbstractType<T> | ClassRef<T>)} target type of class or instance.
     * @param {MethodType} propertyKey method name.
     * @param {Provider[]} providers array of {@link Provider}.
     * @returns {TR} the returnning of invoked method.
     */
    export function invoke<T, TR = any>(injector: Injector, target: T | AbstractType<T>, propertyKey: MethodType<T>, ...providers: Provider[]): TR;
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
    export function invoke<T, TR = any>(injector: Injector, target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, option?: InvokeOptions): TR;
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
    export function invoke<T, TR = any>(injector: Injector, target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, context?: InvocationContext): TR;
    export function invoke<T, TR = any>(injector: Injector, target: T | AbstractType<T> | ClassRef<T>, propertyKey: MethodType<T>, ...args: any[]): TR {
        assertNotDestroyed(injector);
        let providers: Provider[] | undefined;
        let context: InvocationContext | undefined;
        let option: any;
        if (args.length === 1) {
            const arg0 = args[0];
            if (arg0 instanceof InvocationContext) {
                context = arg0;
                providers = Empty;
            } else if (isArray(arg0)) {
                providers = arg0
            } else if (isPlainObject(arg0) && !arg0.provide) {
                option = arg0
            } else {
                providers = args
            }
        } else {
            providers = args
        }

        let targetClass: AbstractType, instance: any;
        let tgRefl: ClassRef | undefined;

        if (!context) {
            option = { ...option, providers };
            context = createContext(injector, option);
        }
        if (isTypeObject(target)) {
            targetClass = getType(target);
            instance = target as T
        } else {
            if (target instanceof ClassRef) {
                tgRefl = target;
                targetClass = target.type
            } else {
                instance = injector.get(target as Token, context);
                targetClass = getType(instance);
                if (!targetClass) {
                    throw new Exception((target as Token).toString() + ' is not implements by any class.')
                }
            }
        }
        tgRefl = tgRefl ?? getClassRef(targetClass);

        return tgRefl.invoke(tgRefl.getMethodName(propertyKey), context, instance)

    }
}
