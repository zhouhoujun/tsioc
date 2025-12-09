import { InjectFlags, Token } from '../tokens';
import { getTypeName } from '../metadata/type';
import { deepForEach } from '../utils/lang';
import { isArray, isFunction, isNumber } from '../utils/chk';
import { isPlainObject } from '../utils/obj';
import { Injector, InjectorRecord, RecordFactory } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { Provider, StaticProvider, DynamicProvider, Provide, DependLike } from '../providers';
import { createResolveContext, getResolver, isParameter, Parameter, ResolveContext, Resolver } from '../resolver';





export function createValueRecord<T = any>(value: T): InjectorRecord<T> {
    return { value };
}

export function createRecord<T>(factory: RecordFactory<T> | undefined, isStatic?: boolean, multi?: boolean): InjectorRecord<T> {
    return { factory, value: isStatic ? LAZY : undefined, multi: multi ? [] : undefined };
}


function isRecord(target: any): target is InjectorRecord {
    return isPlainObject(target) && (
        target.factory || 'value' in target
    )
}


export function resolveParameters(injector: Injector, params?: Parameter[], resolver?: Resolver, context?: ResolveContext) {
    if (!params || !params.length) return [];

    context ??= createResolveContext(injector);

    if (!resolver) {
        resolver = getResolver(injector);
    }

    const args: any[] = [];
    for (let i = 0; i < params.length; i++) {
        args.push(resolver.resolve(params[i], context as ResolveContext));
    }

    return args;
}


/**
 * 辅助函数：为工厂函数调用解析参数
 */
export function resolveArgs(injector: Injector, deps?: DependLike[], resolver?: Resolver, context?: ResolveContext): any[] {
    if (!deps || !deps.length) return [];

    const args: any[] = [];
    for (const arg of deps) {
        if (isParameter(arg)) {
            if (!context) {
                context = createResolveContext(injector);
            }
            if (!resolver) {
                resolver = getResolver(injector);
            }
            args.push(resolver.resolve(arg, context as ResolveContext));
        } else {
            args.push(resolveArg(injector, arg));
        }
    }

    return args;
}

function resolveArg(injector: Injector, arg: DependLike): any {
    if (isArray(arg)) {
        let depFlags = InjectFlags.Default;
        const depToken = arg[0];
        for (let j = 1; j < arg.length; j++) {
            const d = arg[j];
            if (isNumber(d)) {
                depFlags |= d;
            }
        }
        return injector.get(depToken, undefined, depFlags);
    } else if (isRecord(arg)) {
        if (arg.value !== undefined && arg.value !== LAZY) {
            return arg.value;
        }
        const value = arg.factory?.(injector) ?? null;
        if (arg.value === LAZY) arg.value = value;
        return value;
    } else {
        return injector.get(arg as Token);
    }
}




export const LAZY = {};
export const THROW_FLAGE = {};
// export const Empty: any[] = [];
export const CIRCULAR = {};
/**
 * 尝试解析令牌
 */
export function tryResolveToken(token: Token, rd: InjectorRecord, runtime: Runtime, injector: Injector,
    raise: Injector, notFoundValue: any, flags: InjectFlags, isStatic?: boolean): any {
    try {
        const value = resolveToken(token, rd, runtime, injector, raise, notFoundValue, flags, isStatic);
        if (isStatic && rd.value === LAZY && value != undefined && value != LAZY && value !== notFoundValue) {
            rd.value = value;
        }
        return value;
    } catch (e) {
        if (rd && rd.value === CIRCULAR) {
            rd.value = LAZY;
        }
        throw e;
    }
}


/**
 * 解析令牌
 */
export function resolveToken(token: Token, rd: InjectorRecord, runtime: Runtime,
    injector: Injector, raise: Injector, notFoundValue: any, flags: InjectFlags, isStatic?: boolean): any {
    if (rd.value === CIRCULAR) {
        throw new CircularDependencyException()
    }
    // 如果已有值且不是多提供者，直接返回
    if (!rd.multi && rd.value !== undefined && rd.value !== LAZY) {
        return rd.value;
    }

    // 处理多提供者
    if (rd.multi) {
        // 获取父注入器中的值
        const multi: any[] = []
        const parent = injector?.getParent();
        if (parent && !(flags & InjectFlags.Self)) {
            const values = parent.get(token, null, flags, raise);
            if (values) {
                multi.push(...values);
            }
        }

        // 如果有工厂函数，执行并添加结果
        if (rd.factory) {
            const result = rd.factory(raise, flags);
            multi.push(...result);
        }

        return multi;
    }

    // 执行工厂函数获取值
    if (rd.factory) {
        const result = rd.factory(raise, flags);
        // 如果是静态提供者，缓存结果
        if (rd.value === LAZY) {
            rd.value = result;
        }
        return result;
    }

    // 返回默认值
    if (notFoundValue !== undefined) {
        return notFoundValue;
    }

    throw new NullInjectorException(token);
}


const cirMsg = 'Circular dependency';
/**
 * circular dependency execption.
 */
export class CircularDependencyException extends Exception {
    constructor(message?: string) {
        super(message ? cirMsg + message : cirMsg)
    }
}

/**
 * Null injector execption.
 */
export class NullInjectorException extends Exception {
    constructor(token: Token) {
        super(`NullInjectorException: No provider for ${isFunction(token) ? getTypeName(token) : token?.toString()}!`)
    }
}


export function mergePromise(ps1: Promise<any> | undefined | void, ps2: () => any) {
    if (ps1) {
        return ps1.then(ps2);
    }
    return ps2();
}

export function eachProvider(providers: Provider[], cb: (provider: StaticProvider | DynamicProvider) => void) {
    return deepForEach(providers, cb, v => isPlainObject(v) && !((v as Provide<any>).provide || (v as DynamicProvider).provider));
}
