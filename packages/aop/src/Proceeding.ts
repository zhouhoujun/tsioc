import { Abstract, Context, HandlerFn, RuntimeContext, Type } from '@tsdi/ioc';
import { Advices } from './advices/Advices';
import { IPointcut } from './joinpoints/IPointcut';


@Abstract()
export abstract class Proceeding {

    /**
     * invoke constructor pointcut advices.
     * @param ctx 
     * @param next 
     * @param context 
     */
    abstract pointcutConstr(ctx: RuntimeContext, next: HandlerFn, context: Context): any;

    
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
