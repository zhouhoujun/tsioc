import { Abstract, Class, Context, HandlerFn, RuntimeContext } from '@tsdi/ioc';


@Abstract()
export abstract class Proceeding {

    /**
     * pointcut target type in runtime.
     * @param ctx 
     * @param next 
     * @param context 
     */
    abstract pointcut(ctx: RuntimeContext, next: HandlerFn, context: Context): any;

    abstract attach<T>(typeRef: Class<T>, instance: T): T;

    abstract detach<T>(typeRef: Class<T>, instance: T): T;

}
