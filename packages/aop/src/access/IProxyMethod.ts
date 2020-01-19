import { Type, tokenId } from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { Advices } from '../advices/Advices';

/**
 * Aop proxy method interface token.
 * it is a token id, you can register yourself IProxyMethod for this.
 */
export const ProxyMethodToken = tokenId<IProxyMethod>('DI_IProxyMethod');

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
     * @param {Type} targetType
     * @param {IPointcut} pointcut
     * @param {Joinpoint} [provJoinpoint]
     * @memberof IProxyMethod
     */
    proceed(target: any, targetType: Type, advices: Advices,  pointcut: IPointcut, provJoinpoint?: Joinpoint);
}
