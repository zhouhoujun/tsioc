import { AbstractType } from '../types';
import { InjectFlags, Token } from '../tokens';
import { deepForEach } from '../utils/lang';
import { isNil, isArray, isNumber } from '../utils/chk';
import { Injector, InjectorRecord, RegOption } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { ClassRef } from '../metadata/class';
import { Provider, StaticProvider, DynamicProvider, Provide } from '../providers';
import { isPlainObject } from '../utils/obj';




export function createValueRecord<T = any>(value: T, type?: AbstractType<T>): InjectorRecord<T> {
    return type ? { type, value } : { value };
}

export function createRecord<T>(factory: (() => T) | undefined, value: T | null | {}, multi?: boolean): InjectorRecord<T> {
    return { factory, value, multi: multi ? [] : undefined };
}

/**
 * 辅助函数：为工厂函数调用解析参数
 */
export function resolveArgs(injector: Injector, deps?: any[]): any[] {
    if (!deps || !deps.length) return [];

    const args: any[] = [];

    for (let i = 0; i < deps.length; i++) {
        const dep = deps[i];
        let depToken: Token;
        let depFlags = InjectFlags.Default;

        if (isArray(dep)) {
            depToken = dep[0];
            dep.forEach(d => {
                if (isNumber(d)) {
                    depFlags |= d;
                }
            });
        } else {
            depToken = dep;
        }

        args.push(injector.get(depToken, undefined, depFlags));
    }

    return args;
}
export type RegisterExtedOption = (typeRef: ClassRef, option?: RegOption) => RegOption | undefined;



export const THROW_FLAGE = {};
export const Empty: any[] = [];
export const CIRCULAR = {};
/**
 * 尝试解析令牌
 */
export function tryResolveToken(token: Token, rd: InjectorRecord, runtime: Runtime, injector: Injector,
    raise: Injector, notFoundValue: any, flags: InjectFlags, isStatic?: boolean): any {
    try {
        const value = resolveToken(token, rd, runtime, injector, raise, notFoundValue, flags, isStatic);
        if (isStatic && rd.isStatic !== false && !isNil(value) && value !== notFoundValue) {
            rd.value = value;
        }
        return value;
    } catch (e) {
        if (rd && rd.value === CIRCULAR) {
            rd.value = Empty;
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
    if (!rd.multi) {
        return rd.value;
    }

    // 处理多提供者
    if (rd.multi) {
        // 获取父注入器中的值
        const parent = injector?.getParent();
        if (parent && !(flags & InjectFlags.Self)) {
            const values = parent.get(token, null, flags, raise);
            if (values) {
                rd.multi.push(...values);
            }
        }

        // 如果有工厂函数，执行并添加结果
        if (rd.factory) {
            const result = rd.factory();
            rd.multi.push(result);
        }

        return rd.multi;
    }

    // 执行工厂函数获取值
    if (rd.factory) {
        const result = rd.factory();
        // 如果是静态提供者，缓存结果
        if (rd.isStatic) {
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
        super(`NullInjectorException: No provider for ${token?.toString()}!`)
    }
}


export function mergePromise(ps1: Promise<any> | undefined | void, ps2: () => any) {
    if (ps1) {
        return ps1.then(ps2);
    }
    return ps2();
}

export function eachProvider(providers: Provider[], cb: (provider: StaticProvider | DynamicProvider) => void) {
    return deepForEach(providers, cb, v => isPlainObject(v) && !((v as Provide).provide || (v as DynamicProvider).provider));
}
