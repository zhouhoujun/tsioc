import { Token, ParamProviders } from '@ts-ioc/ioc';
import { RefTarget, RefTokenFac } from './types';

export interface IServiceResolver {
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

}
