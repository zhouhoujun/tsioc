import { Registration } from './Registration';
import { ProviderTypes } from './providers/types';
import { IInjector } from './IInjector';

/**
 * module types.
 */
export type Modules = Type | Object;


/**
 *  token interface.
 */
export interface IToken<T = any> {
    (): T;
    tokenId: true;
}

/**
 *  token id.
 */
export type TokenId<T> =  string | symbol | IToken<T>;

/**
 * class type.
 */
export type ClassType<T = any> = Type<T> | AbstractType<T>;
/**
 * symbol type
 */
export type SymbolType<T = any> = ClassType<T> | TokenId<T>;

/**
 * factory tocken.
 */
export type Token<T = any> = Registration<T> | SymbolType<T>;


/**
 * provide token
 */
export type ProvideToken<T> = Registration<T> | TokenId<T>;

/**
 * instance factory.
 */
export type InstanceFactory<T = any> = (...providers: ProviderTypes[]) => T;


/**
 * Factory of Token
 */
export type Factory<T> = T | Type<T> | ((injector?: IInjector) => T);

/**
 * object map.
 *
 * @export
 * @interface ObjectMap
 * @template T
 */
export interface ObjectMap<T = any> {
    [index: string]: T;
}

/**
 * class Annations
 *
 * @export
 * @interface ClassAnnations
 */
export interface ClassAnnations {
    /**
     * class name
     *
     * @type {string}
     * @memberof ClassAnnations
     */
    name: string;
    /**
     * class params declaration.
     *
     * @type {ObjectMap<string[]>}
     * @memberof ClassAnnations
     */
    params: ObjectMap<string[]>;
}



/**
 * abstract type
 *
 * @export
 * @interface AbstractType
 * @extends {Function}
 * @template T
 */
export interface AbstractType<T = any> extends Function {
    new?(...args: any[]): T;
    classAnnations?: ClassAnnations;
    getClassAnnations?(): ClassAnnations;
    /**
     * class flag. none poincut for aop.
     */
    nonePointcut?: boolean;
    /**
     * class type flag.
     */
    classType?: number;
}


/**
 * class type
 * @export
 * @interface Type
 * @extends {Function}
 * @template T
 */
export interface Type<T = any> extends AbstractType<T> {
    new(...args: any[]): T;
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
    (item: T): TResult;
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
