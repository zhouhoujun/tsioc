import { Registration } from './Registration';
import { IContainer } from './IContainer';
import { ProviderTypes } from './providers';

/**
 * module types.
 */
export type Modules = Type<any> | ObjectMap<any>;

/**
 * load modules in base on an path.
 *
 * @export
 * @interface PathModules
 */
export interface PathModules {
    /**
     * fire express base on the root path.
     *
     * @type {string}
     * @memberof LoadOptions
     */
    basePath?: string;
    /**
     * script files match express.
     * see: https://github.com/isaacs/node-glob
     *
     * @type {(string | string[])}
     * @memberof BuilderOptions
     */
    files?: string | string[];

    /**
     * modules
     *
     * @type {((Modules | string)[])}
     * @memberof AsyncLoadOptions
     */
    modules?: (Modules | string)[];
}

/**
 * load module type.
 */
export type LoadType = Modules | string | PathModules;
/**
 * symbol type
 */
export type SymbolType<T> = Type<T> | AbstractType<T> | string | symbol;

/**
 * factory tocken.
 */
export type Token<T> = Registration<T> | SymbolType<T>;


/**
 * instance factory.
 */
export type InstanceFactory<T> = (...providers: ProviderTypes[]) => T

/**
 * to instance via container.
 */
export type ToInstance<T> = (container?: IContainer, ...providers: ProviderTypes[]) => T;

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
 * class type
 * @export
 * @interface Type
 * @extends {Function}
 * @template T
 */
export interface Type<T> extends Function {
    new(...args: any[]): T;
    classAnnations?: ClassAnnations;
}

/**
 * abstract type
 *
 * @export
 * @interface AbstractType
 * @extends {Function}
 * @template T
 */
export interface AbstractType<T> extends Function {
    new?(...args: any[]): T;
    classAnnations?: ClassAnnations;
}

export interface IReference<T> {
    /**
     * ref service
     *
     * @type {Token<T>}
     * @memberof IReference
     */
    service: Token<T>;
    /**
     * is private service of target class or not.
     *
     * @type {boolean}
     * @memberof IReference
     */
    isPrivate?: boolean;
}

/**
 * reference token type.
 */
export type RefTokenType<T> = IReference<T> | Token<T>;

export type RefTokenFac<T> = (token: Token<any>) => RefTokenType<T> | RefTokenType<T>[];

export type RefTokenFacType<T> = Type<Registration<T>> | RefTokenType<T> | RefTokenFac<T>

/**
 * reference token.
 */
export type ReferenceToken<T> = RefTokenFacType<T> | RefTokenFacType<T>[];


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
