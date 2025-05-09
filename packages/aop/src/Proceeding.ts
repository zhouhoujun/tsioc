import { Abstract, Context, HandlerFn, RuntimeContext } from '@tsdi/ioc';


@Abstract()
export abstract class Proceeding {

    /**
     * pointcut constructor target type in runtime.
     * @param ctx 
     * @param next 
     * @param context 
     */
    abstract pointcutCtor(ctx: RuntimeContext, next: HandlerFn, context: Context): any;
    /**
     * pointcut property target type in runtime.
     * @param ctx 
     * @param next 
     * @param context 
     */
    abstract pointcutProperty(ctx: RuntimeContext, next: HandlerFn, context: Context): any;

}
