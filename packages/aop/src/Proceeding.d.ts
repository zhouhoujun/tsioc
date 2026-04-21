import { ClassRef, HandlerFn, IocContext } from '@tsdi/ioc';
export declare abstract class Proceeding {
    /**
     * pointcut constructor target type in runtime.
     * @param ctx
     * @param next
     * @param context
     */
    abstract pointcutCtor(typeRef: ClassRef, next: HandlerFn, context: IocContext): any;
    /**
     * pointcut property target type in runtime.
     * @param ctx
     * @param next
     * @param context
     */
    abstract pointcutProperty(typeRef: ClassRef, next: HandlerFn, context: IocContext): any;
}
