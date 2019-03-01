import { Token, RefTarget, RefTokenFac, ReferenceToken, ClassType, InstanceFactory } from '../types';
import { ParamProviders } from '../providers';
import { IResolver } from '../IResolver';
import { IocService } from '@ts-ioc/ioc';

/**
 * service resover interface.
 *
 * @export
 * @interface IServiceResover
 */
export interface IServiceResover {
    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], ...providers: ParamProviders[]): T;
}

/**
 * service resolver
 *
 * @export
 * @class ServiceResolver
 */
export abstract class ServiceResolver extends IocService {
    constructor() {
        super();
    }

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    abstract getService<T>(token: Token<T> | Token<any>[], ...providers: ParamProviders[]): T;
}

/**
 * service resover interface.
 *
 * @export
 * @interface IServiceResover
 */
export interface IServiceResover {
    /**
     * resolve first token when not null.
     *
     * @template T
     * @param {Token<any>[]} tokens
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    resolveFirst<T>(tokens: Token<any>[], ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], target: RefTarget | RefTarget[], ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {RefTokenFac<T>} toRefToken
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], target: RefTarget | RefTarget[], toRefToken: RefTokenFac<T>, ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {(boolean | Token<T>)} defaultToken
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], target: RefTarget | RefTarget[], defaultToken: boolean | Token<T>, ...providers: ParamProviders[]): T;

    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {RefTokenFac<T>} toRefToken
     * @param {(boolean | Token<T>)} defaultToken
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(token: Token<T> | Token<any>[], target: RefTarget | RefTarget[], toRefToken: RefTokenFac<T>, defaultToken: boolean | Token<T>, ...providers: ParamProviders[]): T;

    /**
     * get target reference service.
     *
     * @template T
     * @param {ReferenceToken<T>} [refToken] reference service Registration Injector
     * @param {(RefTarget | RefTarget[])} target  the service reference to.
     * @param {Token<T>} [defaultToken] default service token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getRefService<T>(refToken: ReferenceToken<T>, target: RefTarget | RefTarget[], defaultToken?: Token<T> | Token<any>[], ...providers: ParamProviders[]): T

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
     * @param {ResoveWay} [resway=ResoveWay.all] resolve way. bubble, traverse.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getServices<T>(type: ClassType<T> | ((token: ClassType<T>) => boolean), ...providers: ParamProviders[]): T[];

    /**
    * get all private services of target extends class `type`.
    * @template T
    * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
    * @param {(ClassType<any> | ClassType<any>[])} [target] service private of target.
    * @param {ResoveWay} [resway=ResoveWay.all] resolve way. bubble, traverse.
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    getServices<T>(type: Token<T> | ((token: ClassType<T>) => boolean), target: Token<any> | Token<any>[], ...providers: ParamProviders[]): T[];

    /**
    * get all servies extends class `type` and all private services of target extends class `type`.
    *
    * @template T
    * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
    * @param {(ClassType<any> | ClassType<any>[])} [target] service private of target.
    * @param {boolean} both if true, will get all server and target private service of class extends `type` .
    * @param {ResoveWay} [resway=ResoveWay.all] resolve way. bubble, traverse.
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    getServices<T>(type: Token<T> | ((token: ClassType<T>) => boolean), target: Token<any> | Token<any>[], both: boolean, ...providers: ParamProviders[]): T[];


    /**
     * iterator all service extends type.
     *
     * @template T
     * @param {(tk: ClassType<T>, fac: InstanceFactory<T>, resolvor?: IResolver, ...providers: ParamProviders[]) => void | boolean} express
     * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
     * @param {ResoveWay} [resway=ResoveWay.all] resolve way. bubble, traverse.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    iteratorServices<T>(
        express: (tk: ClassType<T>, fac: InstanceFactory<T>, resolvor?: IResolver, ...providers: ParamProviders[]) => void | boolean,
        type: ClassType<T> | ((token: ClassType<T>) => boolean),
        ...providers: ParamProviders[]): void;

    /**
    * iterator all private services of target extends class `type`.
    * @template T
    * @param {(tk: ClassType<T>, fac: InstanceFactory<T>, resolvor?: IResolver, ...providers: ParamProviders[]) => void | boolean} express
    * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
    * @param {(ClassType<any> | ClassType<any>[])} [target] service private of target.
    * @param {ResoveWay} [resway=ResoveWay.all] resolve way. bubble, traverse.
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    iteratorServices<T>(
        express: (tk: ClassType<T>, fac: InstanceFactory<T>, resolvor?: IResolver, ...providers: ParamProviders[]) => void | boolean,
        type: Token<T> | ((token: ClassType<T>) => boolean),
        target: Token<any> | Token<any>[],
        ...providers: ParamProviders[]): void;

    /**
    * iterator all servies extends class `type` and all private services of target extends class `type`.
    *
    * @template T
    * @param {(tk: ClassType<T>, fac: InstanceFactory<T>, resolvor?: IResolver, ...providers: ParamProviders[]) => void | boolean} express
    * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
    * @param {(ClassType<any> | ClassType<any>[])} [target] service private of target.
    * @param {boolean} both if true, will get all server and target private service of class extends `type` .
    * @param {ResoveWay} [resway=ResoveWay.all] resolve way. bubble, traverse.
    * @param {...ParamProviders[]} providers
    * @returns {T}
    * @memberof IContainer
    */
    iteratorServices<T>(
        express: (tk: ClassType<T>, fac: InstanceFactory<T>, resolvor?: IResolver, ...providers: ParamProviders[]) => void | boolean,
        type: Token<T> | ((token: ClassType<T>) => boolean),
        target: Token<any> | Token<any>[],
        both: boolean,
        ...providers: ParamProviders[]): void;


    /**
     * iterate token  in  token class chain.  return false will break iterate.
     *
     * @param {RefTarget} target
     * @param {(token: Token<any>, classProviders?: Token<any>[]) => boolean} express
     * @memberof IContainer
     */
    forInRefTarget(target: RefTarget, express: (token: Token<any>, classProviders?: Token<any>[]) => boolean): void;

    /**
     * get token implement class and base classes.
     *
     * @param {Token<any>} token
     * @param {boolean} [chain] get all base classes or only impletment class. default true.
     * @returns {Token<any>[]}
     * @memberof IContainer
     */
    getTokenClassChain(token: Token<any>, chain?: boolean): Token<any>[];

}