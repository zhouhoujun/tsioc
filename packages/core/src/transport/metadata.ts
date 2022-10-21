
import { createDecorator, Decors, isClass, isFunction, ReflectiveFactory, Type } from '@tsdi/ioc';
import { Respond, EndpointHandlerMethodResolver, TypedRespond } from './filter';
import { ServerEndpointContext } from './context';

/**
 * Endpoint handler metadata.
 */
export interface EndpointHandlerMetadata {
    /**
     * execption type.
     */
    filter: Type | string;
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
 * EndpointHandler decorator, for class. use to define the class as response handle register in global EndpointHandler filter.
 *
 * @export
 * @interface EndpointHandler
 */
export interface EndpointHandler {
    /**
     * message handle. use to handle route message event, in class with decorator {@link RouteMapping}.
     *
     * @param {Type} filter message match pattern.
     * @param {order?: number } option message match option.
     */
    (filter: Type, option?: {
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
 * EndpointHandler decorator, for class. use to define the class as Endpoint handle register in global Endpoint filter.
 * @EndpointHandler
 * 
 * @exports {@link EndpointHandler}
 */
export const EndpointHandler: EndpointHandler = createDecorator('EndpointHandler', {
    props: (filter?: Type | string, options?: { order?: number }) => ({ filter, ...options }),
    design: {
        method: (ctx, next) => {
            const def = ctx.def;
            const decors = def.class.getDecorDefines<EndpointHandlerMetadata>(ctx.currDecor, Decors.method);
            const injector = ctx.injector;
            const factory = injector.get(ReflectiveFactory).create(def, injector);
            decors.forEach(decor => {
                const { filter, order, response } = decor.metadata;
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
                injector.get(EndpointHandlerMethodResolver).addHandle(filter, invoker, order)
            });

            next()
        }
    }
});
