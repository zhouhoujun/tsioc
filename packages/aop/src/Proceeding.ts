import { Abstract, Injector, InvocationContext, ParameterMetadata, Type } from '@tsdi/ioc';
import { Advices } from './advices/Advices';
import { IPointcut } from './joinpoints/IPointcut';


@Abstract()
export abstract class Proceeding {

    /**
     * invoke before constructor advices.
     * @param targetType 
     * @param params 
     * @param args 
     * @param injector 
     * @param parent 
     */
    abstract beforeConstr(targetType: Type, params: ParameterMetadata[] | undefined, args: any[] | undefined, injector: Injector, parent: InvocationContext | undefined): void;
    /**
     * invoke after constructor advices.
     * @param target 
     * @param targetType 
     * @param params 
     * @param args 
     * @param injector 
     * @param parent 
     */
    abstract afterConstr(target: any, targetType: Type, params: ParameterMetadata[] | undefined, args: any[] | undefined, injector: Injector, parent: InvocationContext | undefined): void;
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
