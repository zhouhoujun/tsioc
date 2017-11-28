import { Type, AbstractType } from './Type';
import { Registration } from './Registration';
import { IContainer } from './IContainer';

/**
 * symbol type
 */
export type SymbolType<T> = Type<T> | AbstractType<T> | string | symbol;
/**
 * factory tocken.
 */
export type Token<T> = Registration<T> | SymbolType<T>;


/**
 * to instance via container.
 */
export type ToInstance<T> = (container?: IContainer) => T;

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
     * iterate as tree map.
     */
    traverse
}

/**
 * symbols of container.
 */
export const symbols = {
    IContainer: Symbol('IContainer'),
    IMethodAccessor: Symbol('IMethodAccessor')
}
