import { Type } from './Type';
import { Registration } from './Registration';
import { type } from 'os';
import { IContainer } from './IContainer';

/**
 * factory tocken.
 */
export type Token<T> = Type<T> | Registration<T> | string | symbol;

/**
 * Factory of Token
 */
export type Factory<T> = T | ((container?: IContainer) => T);
