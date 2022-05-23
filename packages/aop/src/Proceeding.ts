import { Abstract, Type } from '@tsdi/ioc';
import { Advices } from './advices/Advices';
import { IPointcut } from './joinpoints/IPointcut';


@Abstract()
export abstract class Proceeding {
    /**
     * proceed the proxy method.
     *
     * @param {*} target
     * @param {Type} targetType
     * @param {IPointcut} pointcut
     * @param {Joinpoint} [provJoinpoint]
     */
    abstract proceed(target: any, targetType: Type, advices: Advices, pointcut: IPointcut): void;
}