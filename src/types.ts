import { Type, AbstractType } from './Type';
import { Registration } from './Registration';
import { IContainer } from './IContainer';
import { ParamProvider } from './ParamProvider';
import { ProviderMap } from './ProviderMap';

/**
 * symbol type
 */
export type SymbolType<T> = Type<T> | AbstractType<T> | string | symbol;

/**
 * factory tocken.
 */
export type Token<T> = Registration<T> | SymbolType<T>;

export type Providers = ProviderMap | ParamProvider;


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
