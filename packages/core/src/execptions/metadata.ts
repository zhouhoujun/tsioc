import { createDecorator, OperationFactoryResolver, Type } from '@tsdi/ioc';
import { ExecptionHandlerMethodResolver } from './resolver';

/**
 * execption handler metadata.
 */
export interface ExecptionHandlerMetadata {
    /**
     * execption type.
     */
    execption: Type<Error>;
    /**
     * order.
     */
    order?: number;
    /**
     * handle expection as response type.
     */
    response?: 'body' | 'header' | 'response';
}



/**
 * ExecptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 *
 * @export
 * @interface ExecptionHandler
 */
 export interface ExecptionHandler {
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {string} pattern message match pattern.
     * @param {order?: number } option message match option.
     */
    (execption: Type<Error>, option?: { order?: number }): MethodDecorator;
}

/**
 * ExecptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExecptionHandler
 * 
 * @exports {@link ExecptionHandler}
 */
export const ExecptionHandler: ExecptionHandler = createDecorator('Handle', {
    props: (execption?: Type<Error>, options?: { order?: number }) => ({ execption, ...options }),
    reflect: {
        class: (ctx, next) => {
            ctx.reflect.annotation = ctx.metadata;
            return next();
        }
    },
    design: {
        method: (ctx, next) => {
            const reflect = ctx.reflect;
            const decor = reflect.class.getDecorDefine<ExecptionHandlerMetadata>(ctx.currDecor)!;
            const { execption, order } = decor.metadata;
            const injector = ctx.injector;

            const invoker = injector.get(OperationFactoryResolver).resolve(reflect, injector).createInvoker(decor.propertyKey);
            injector.get(ExecptionHandlerMethodResolver).addHandle(execption, invoker, order);
            next();
        }
    }
});
