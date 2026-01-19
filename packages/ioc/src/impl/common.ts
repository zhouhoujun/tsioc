import { InjectFlags, token, Token } from '../tokens';
import { getTypeName } from '../metadata/type';
import { deepForEach } from '../utils/lang';
import { isArray, isFunction, isNumber, isObject } from '../utils/chk';
import { isPlainObject } from '../utils/obj';
import { Injector, InjectorRecord, RecordFactory } from '../injector';
import { Exception } from '../exception';
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


export function resolveParameters(injector: Injector, params?: Parameter[], context?: ResolveContext, resolver?: Resolver) {
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
export function resolveArgs(injector: Injector, deps?: DependLike[], context?: ResolveContext, resolver?: Resolver): any[] {
    if (!deps || !deps.length) return [];



    const args: any[] = [];
    for (const arg of deps) {
        if (isParameter(arg)) {
            if (!resolver) {
                context ??= createResolveContext(injector);
                resolver = getResolver(injector);
            }
            args.push(resolver.resolve(arg, context!));
        } else {
            args.push(resolveArg(injector, arg, context));
        }
    }

    return args;
}

function resolveArg(injector: Injector, arg: DependLike, context?: ResolveContext): any {
    if (isRecord(arg)) {
        if (arg.value !== undefined && arg.value !== LAZY) {
            return arg.value;
        }
        const value = arg.factory?.(context) ?? null;
        if (arg.value === LAZY) arg.value = value;
        return value;
    } else {
        let depFlags = InjectFlags.Default;
        let depToken: Token
        if (isArray(arg)) {
            depToken = arg[0];
            for (let j = 1; j < arg.length; j++) {
                const d = arg[j];
                if (isNumber(d)) {
                    depFlags |= d;
                }
            }
        } else {
            depToken = arg as Token;
        }
        if(context?.has(token)) return context.get(token);
        
        return injector.get(depToken, undefined, depFlags);

    }

}




export const LAZY = {};
export const THROW_FLAGE = {};
// export const Empty: any[] = [];
// export const CIRCULAR = {};

export const STATICABLE = Symbol('STATICABLE');

/**
 * 尝试解析令牌
 */
export function tryResolveToken(token: Token, rd: InjectorRecord, injector: Injector,
    notFoundValue: any, flags: InjectFlags, context?: ResolveContext, isStatic?: boolean): any {
    try {
        return resolveToken(token, rd, injector, notFoundValue, flags, context);
    } catch (e) {
        if (rd) {
            rd.value = LAZY;
        }
        throw e;
    }
}


/**
 * 解析令牌
 */
export function resolveToken(token: Token, rd: InjectorRecord, injector: Injector,
    notFoundValue: any, flags: InjectFlags, context?: ResolveContext): any {
    // if (rd.value === CIRCULAR) {
    //     throw new CircularDependencyException()
    // }
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
            const values = parent.get(token, null, flags, context);
            if (values) {
                multi.push(...values);
            }
        }

        if (rd.factory) { // 如果有工厂函数，执行并添加结果
            const result = rd.factory(context, flags);
            multi.push(...result);
        }


        return multi;
    }

    // 执行工厂函数获取值
    if (rd.factory) {
        const result = rd.factory(context, flags);
        const stati = rd.value === LAZY;
        if (isObject(result)) result[STATICABLE] = stati;
        // 如果是静态提供者，缓存结果
        if (stati) {
            rd.value = result;
        }
        return result;
    }

    // 返回默认值
    return notFoundValue;
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
