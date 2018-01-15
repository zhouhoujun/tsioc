import { Type, AbstractType } from './Type';
import { Registration } from './Registration';
import { IContainer } from './IContainer';
import { ParamProvider, ProviderMap, Provider } from './providers/index';

/**
 * symbol type
 */
export type SymbolType<T> = Type<T> | AbstractType<T> | string | symbol;

/**
 * factory tocken.
 */
export type Token<T> = Registration<T> | SymbolType<T>;

/**
 * providers
 */
export type Providers = ProviderMap | Provider;


/**
 * to instance via container.
 */
export type ToInstance<T> = (container?: IContainer, ...providers: Providers[]) => T;

/**
 * Factory of Token
 */
export type Factory<T> = T | Type<T> | ToInstance<T>;

/**
 * object map.
 *
 * @export
 * @interface ObjectMap
 * @template T
 */
export interface ObjectMap<T> {
    [index: string]: T
}

/**
 * express.
 *
 * @export
 * @interface Express
 * @template T
 * @template TResult
 */
export interface Express<T, TResult> {
    (item: T): TResult
}

/**
 * express
 *
 * @export
 * @interface Express2
 * @template T1
 * @template T2
 * @template TResult
 */
export interface Express2<T1, T2, TResult> {
    (arg1: T1, arg2: T2): TResult
}
/**
 * express
 *
 * @export
 * @interface Express3
 * @template T1
 * @template T2
 * @template T3
 * @template TResult
 */
export interface Express3<T1, T2, T3, TResult> {
    (arg1: T1, arg2: T2, arg3: T3): TResult
}
/**
 * express
 *
 * @export
 * @interface Express4
 * @template T1
 * @template T2
 * @template T3
 * @template T4
 * @template TResult
 */
export interface Express4<T1, T2, T3, T4, TResult> {
    (arg1: T1, arg2: T2, arg3: T3, arg4: T4): TResult
}
/**
 * express.
 *
 * @export
 * @interface Express5
 * @template T1
 * @template T2
 * @template T3
 * @template T4
 * @template T5
 * @template TResult
 */
export interface Express5<T1, T2, T3, T4, T5, TResult> {
    (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5): TResult
}

/**
 * State of type in ioc.
 *
 * @export
 * @enum {number}
 */
export enum IocState {
    design = 'design',
    runtime = 'runtime'
}

/**
 * iterate way.
 *
 * @export
 * @enum {number}
 */
export enum Mode {
    /**
     * route up. iterate in parents.
     */
    route = 1,
    /**
     * iterate in children.
     */
    children,
    /**
     * iterate as tree map. node first
     */
    traverse,

    /**
     * iterate as tree map. node last
     */
    traverseLast,

}
