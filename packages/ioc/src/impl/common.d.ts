import { InjectFlags, Token } from '../tokens';
import { Injector, InjectorRecord, RecordFactory } from '../injector';
import { Exception } from '../exception';
import { Provider, StaticProvider, DynamicProvider, DependLike } from '../providers';
import { Parameter, Resolver } from '../resolver';
import { RunContext } from '../handlers/contexts';
export declare function createValueRecord<T = any>(value: T): InjectorRecord<T>;
export declare function createRecord<T>(factory: RecordFactory<T> | undefined, injectStati?: boolean, tokenStati?: boolean, multi?: boolean): InjectorRecord<T>;
export declare function resolveParameters(injector: Injector, params?: Parameter[], context?: RunContext, resolver?: Resolver): any[];
export declare function resolveArgs(injector: Injector, deps?: DependLike[], context?: RunContext, resolver?: Resolver): any[];
export declare const LAZY: {};
export declare const THROW_FLAGE: {};
/**
 * 尝试解析令牌
 */
export declare function tryResolveToken(token: Token, rd: InjectorRecord, injector: Injector, notFoundValue: any, flags: InjectFlags, context?: RunContext): any;
export declare function resolveToken(token: Token, rd: InjectorRecord, injector: Injector, notFoundValue: any, flags: InjectFlags, context?: RunContext): any;
/**
 * circular dependency execption.
 */
export declare class CircularDependencyException extends Exception {
    constructor(message?: string);
}
/**
 * Null injector execption.
 */
export declare class NullInjectorException extends Exception {
    constructor(token: Token);
}
export declare function mergePromise(ps1: Promise<any> | undefined | void, ps2: () => any): any;
export declare function eachProvider(providers: Provider[], cb: (provider: StaticProvider | DynamicProvider) => void): void | Promise<void>;
