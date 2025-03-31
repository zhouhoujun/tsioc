import { Abstract, Class, Context, HandlerFn, RuntimeContext, Type } from '@tsdi/ioc';
import { Advisor } from './Advisor';


@Abstract()
export abstract class Proceeding {

    /**
     * pointcut target type in runtime.
     * @param ctx 
     * @param next 
     * @param context 
     */
    abstract pointcut(ctx: RuntimeContext, next: HandlerFn, context: Context): any;


    abstract attach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T;

    abstract detach<T>(typeRef: Class<T>, instance: T, advisor?: Advisor): T;

    
}
