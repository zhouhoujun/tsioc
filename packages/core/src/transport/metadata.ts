
import { createDecorator, Decors, isClass, isFunction, ReflectiveFactory, Type } from '@tsdi/ioc';
import { Respond, RespondHandlerMethodResolver, TypedRespond } from './filter';
import { ServerEndpointContext } from './context';
import { Status } from './status';

/**
 * Respond handler metadata.
 */
export interface RespondHandlerMetadata {
    /**
     * execption type.
     */
    status: Type<Status>;
    /**
     * order.
     */
    order?: number;
    /**
     * handle expection as response type.
     */
    response?: 'body' | 'header' | 'response' | Type<Respond> | ((ctx: ServerEndpointContext, returnning: any) => void)
}



/**
 * RespondHandler decorator, for class. use to define the class as response handle register in global response filter.
 *
 * @export
 * @interface RespondHandler
 */
export interface RespondHandler {
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
        response?: 'body' | 'header' | 'response' | Type<Respond> | ((ctx: ServerEndpointContext, returnning: any) => void)
    }): MethodDecorator;
}

/**
 * ExecptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExecptionHandler
 * 
 * @exports {@link RespondHandler}
 */
export const RespondHandler: RespondHandler = createDecorator('RespondHandler', {
    props: (execption?: Type<Error>, options?: { order?: number }) => ({ execption, ...options }),
    design: {
        method: (ctx, next) => {
            const def = ctx.def;
            const decors = def.class.getDecorDefines<RespondHandlerMetadata>(ctx.currDecor, Decors.method);
            const injector = ctx.injector;
            const factory = injector.get(ReflectiveFactory).create(def, injector);
            decors.forEach(decor => {
                const { status, order, response } = decor.metadata;
                const invoker = factory.createInvoker(decor.propertyKey);
                if (response) {
                    if (isClass(response)) {
                        invoker.onReturnning((ctx, value) => {
                            ctx.resolve(response).respond(ctx.resolve(ServerEndpointContext), value);
                        })
                    } else if (isFunction(response)) {
                        invoker.onReturnning((ctx, value) => {
                            response(ctx.resolve(ServerEndpointContext), value);
                        })
                    } else {
                        invoker.onReturnning((ctx, value) => {
                            ctx.resolve(TypedRespond).respond(ctx.resolve(ServerEndpointContext), response, value);
                        })
                    }
                }
                injector.get(RespondHandlerMethodResolver).addHandle(status, invoker, order)
            });

            next()
        }
    }
});
