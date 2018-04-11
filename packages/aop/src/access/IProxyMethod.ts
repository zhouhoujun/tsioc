import { Type } from '@ts-ioc/core';
import { IPointcut, Joinpoint } from '../joinpoints/index';

export interface IProxyMethod {
    proceed(target: any, targetType: Type<any>, pointcut: IPointcut, provJoinpoint?: Joinpoint);
}
