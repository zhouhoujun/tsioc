import { Type, AbstractType } from './Type';
import { Registration } from './Registration';
import { IContainer } from './IContainer';
import { type } from 'os';
import { close } from 'inspector';
import { fail } from 'assert';

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

export function isClass(target: any) {
    if (!target) {
        return false;
    }

    if (typeof target !== 'function') {
        return false;
    }

    if (target.prototype) {
        try {
            target.arguments && target.caller;
            return false;
        } catch (e) {
            return true;
        }
    }

    return false;
}
