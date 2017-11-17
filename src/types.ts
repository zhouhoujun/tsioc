import { Type, AbstractType } from './Type';
import { Registration } from './Registration';
import { IContainer } from './IContainer';
import { type } from 'os';

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
