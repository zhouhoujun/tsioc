import { createDecorator, InvocationContext, OperationFactoryResolver, Type } from '@tsdi/ioc';
import { TransportContext } from '../transport';
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
    response?: 'body' | 'header' | 'response' | ((ctx: InvocationContext, returnning: any) => void);
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
            const { execption, order, response } = decor.metadata;
            const injector = ctx.injector;

            const invoker = injector.get(OperationFactoryResolver).resolve(reflect, injector).createInvoker(decor.propertyKey);
            if (response) {
                if (response === 'body') {
                    invoker.onReturnning((ctx, value) => {
                        ctx.resolve(TransportContext).body = value;
                    })
                } else if (response === 'header') {
                    invoker.onReturnning((ctx, value) => {
                        ctx.resolve(TransportContext).setHeader(value);
                    })
                } else if (response === 'response') {
                    invoker.onReturnning((ctx, value) => {
                        ctx.resolve(TransportContext).message = String(value);
                    });
                } else {
                    invoker.onReturnning(response);
                }
            }
            injector.get(ExecptionHandlerMethodResolver).addHandle(execption, invoker, order);
            next();
        }
    }
});
