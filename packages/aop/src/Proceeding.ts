import { Abstract, Context, HandlerFn, InitializeContext } from '@tsdi/ioc';


@Abstract()
export abstract class Proceeding {

    /**
     * pointcut constructor target type in runtime.
     * @param ctx 
     * @param next 
     * @param context 
     */
    abstract pointcutCtor(ctx: InitializeContext, next: HandlerFn, context: Context): any;
    /**
     * pointcut property target type in runtime.
     * @param ctx 
     * @param next 
     * @param context 
     */
    abstract pointcutProperty(ctx: InitializeContext, next: HandlerFn, context: Context): any;

}
