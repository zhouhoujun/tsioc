import { createDecorator, Decors, InvocationContext, ReflectiveResolver, Type } from '@tsdi/ioc';
import { TransportContext, TransportError } from '../transport';
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
    (execption: Type<Error>, option?: {
        /**
         * order.
         */
        order?: number;
        /**
         * handle expection as response type.
         */
        response?: 'body' | 'header' | 'response' | ((ctx: InvocationContext, returnning: any) => void)
    }): MethodDecorator;
}

/**
 * ExecptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExecptionHandler
 * 
 * @exports {@link ExecptionHandler}
 */
export const ExecptionHandler: ExecptionHandler = createDecorator('ExecptionHandler', {
    props: (execption?: Type<Error>, options?: { order?: number }) => ({ execption, ...options }),
    design: {
        method: (ctx, next) => {
            const reflect = ctx.reflect;
            const decors = reflect.class.getDecorDefines<ExecptionHandlerMetadata>(ctx.currDecor, Decors.method);
            const injector = ctx.injector;
            const factory = injector.get(ReflectiveResolver).resolve(reflect, injector);
            decors.forEach(decor => {
                const { execption, order, response } = decor.metadata;
                const invoker = factory.createInvoker(decor.propertyKey);
                if (response) {
                    if (response === 'body') {
                        invoker.onReturnning((ctx, value) => {
                            ctx.resolve(TransportContext).body = value
                        })
                    } else if (response === 'header') {
                        invoker.onReturnning((ctx, value) => {
                            ctx.resolve(TransportContext).setHeader(value)
                        })
                    } else if (response === 'response') {
                        invoker.onReturnning((ctx, value) => {
                            const context = ctx.resolve(TransportContext);
                            if (value instanceof TransportError) {
                                context.status = value.statusCode;
                                context.statusMessage = value.message
                            } else {
                                context.status = 500;
                                context.statusMessage = String(value)
                            }
                        })
                    } else {
                        invoker.onReturnning(response)
                    }
                }
                injector.get(ExecptionHandlerMethodResolver).addHandle(execption, invoker, order)
            });

            next()
        }
    }
});
