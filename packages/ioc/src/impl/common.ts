import { InjectFlags, Token } from '../tokens';
import { getTypeName } from '../metadata/type';
import { deepForEach } from '../utils/lang';
import { isArray, isBoolean, isFunction, isNumber } from '../utils/chk';
import { isPlainObject } from '../utils/obj';
import { Injector, InjectorRecord, RecordFactory } from '../injector';
import { Exception } from '../exception';
import { Provider, StaticProvider, DynamicProvider, Provide, DependLike } from '../providers';
import { getResolver, isParameter, Parameter, Resolver } from '../resolver';
import { createRunContext, RunContext } from '../handlers/contexts';






export function createValueRecord<T = any>(value: T): InjectorRecord<T> {
    return { value };
}

export function createRecord<T>(factory: RecordFactory<T> | undefined, injectStati?: boolean, tokenStati?: boolean, multi?: boolean,): InjectorRecord<T> {
    const record: InjectorRecord = { factory, value: (tokenStati ?? injectStati) ? LAZY : undefined, multi: multi ? [] : undefined };
    if (isBoolean(tokenStati)) {
        record.stati = tokenStati;
    }
    return record;
}


function isRecord(target: any): target is InjectorRecord {
    return isPlainObject(target) && (
        target.factory || 'value' in target
    )
}


export function resolveParameters(injector: Injector, params?: Parameter[], context?: RunContext, resolver?: Resolver) {
    if (!params || !params.length) return [];

    if (!context) {
        context = createRunContext(injector);
    }

    if (!resolver) {
        resolver = getResolver(injector);
    }

    const len = params.length;
    const args = new Array(len);
    for (let i = 0; i < len; i++) {
        args[i] = resolver.resolve(params[i], context);
    }

    return args;
}


export function resolveArgs(injector: Injector, deps?: DependLike[], context?: RunContext, resolver?: Resolver): any[] {
    if (!deps || !deps.length) return [];

    const ctx = context ?? createRunContext(injector);
    const resolverRef = resolver ?? getResolver(injector);

    const len = deps.length;
    const args = new Array(len);
    for (let i = 0; i < len; i++) {
        const arg = deps[i];
        if (isParameter(arg)) {
            args[i] = resolverRef.resolve(arg, ctx);
        } else {
            args[i] = resolveArg(injector, arg, ctx);
        }
    }

    return args;
}

function resolveArg(injector: Injector, arg: DependLike, context?: RunContext): any {
    if (isRecord(arg)) {
        if (arg.value !== undefined && arg.value !== LAZY) {
            return arg.value;
        }
        const value = arg.factory?.(context) ?? null;
        if (arg.value === LAZY) arg.value = value;
        return value;
    } else {
        let depFlags = InjectFlags.Default;
        let depToken: Token;
        if (isArray(arg)) {
            depToken = arg[0];
            const len = arg.length;
            for (let j = 1; j < len; j++) {
                const d = arg[j];
                if (isNumber(d)) {
                    depFlags |= d;
                }
            }
        } else {
            depToken = arg as Token;
        }
        if (context?.has(depToken)) return context.get(depToken);

        return injector.get(depToken, undefined, depFlags);
    }
}




export const LAZY = {};
export const THROW_FLAGE = {};
// export const Empty: any[] = [];
// export const CIRCULAR = {};
// export const STATICABLE = Symbol('STATICABLE');

/**
 * 尝试解析令牌
 */
export function tryResolveToken(token: Token, rd: InjectorRecord, injector: Injector,
    notFoundValue: any, flags: InjectFlags, context?: RunContext): any {
    try {
        return resolveToken(token, rd, injector, notFoundValue, flags, context);
    } catch (e) {
        if (rd) {
            rd.value = LAZY;
        }
        throw e;
    }
}


export function resolveToken(token: Token, rd: InjectorRecord, injector: Injector,
    notFoundValue: any, flags: InjectFlags, context?: RunContext): any {
    const multi = rd.multi;
    if (!multi && rd.value !== undefined && rd.value !== LAZY) {
        return rd.value;
    }

    if (multi) {
        const parent = injector?.getParent();
        const hasParent = parent && !(flags & InjectFlags.Self);
        const values = hasParent ? parent.get(token, null, flags, context) : null;
        const factory = rd.factory;
        
        if (values || factory) {
            const result: any[] = [];
            if (values) {
                result.push(...values);
            }
            if (factory) {
                result.push(...factory(context, flags));
            }
            return result;
        }
        return multi;
    }

    const factory = rd.factory;
    if (factory) {
        const result = factory(context, flags);
        if (rd.value === LAZY) {
            rd.value = result;
        }
        return result;
    }

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
