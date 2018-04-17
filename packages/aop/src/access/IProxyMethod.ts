import { Type } from '@ts-ioc/core';
import { IPointcut, Joinpoint } from '../joinpoints/index';

/**
 * proxy method, for proxy advice method.
 *
 * @export
 * @interface IProxyMethod
 */
export interface IProxyMethod {
    /**
     * proceed the proxy method.
     *
     * @param {*} target
     * @param {Type<any>} targetType
     * @param {IPointcut} pointcut
     * @param {Joinpoint} [provJoinpoint]
     * @memberof IProxyMethod
     */
    proceed(target: any, targetType: Type<any>, pointcut: IPointcut, provJoinpoint?: Joinpoint);
}
