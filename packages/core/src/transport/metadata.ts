
import { createDecorator, Decors, isClass, isFunction, ReflectiveFactory, Type } from '@tsdi/ioc';
import { Respond, FilterHandlerMethodResolver, TypedRespond } from './filter';
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
 * EndpointHanlder decorator, for class. use to define the class as response handle register in global Endpoint filter.
 *
 * @export
 * @interface EndpointHanlder
 */
export interface EndpointHanlder {
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
 * EndpointHanlder decorator, for class. use to define the class as Endpoint handle register in global Endpoint filter.
 * @EndpointHanlder
 * 
 * @exports {@link EndpointHanlder}
 */
export const EndpointHanlder: EndpointHanlder = createDecorator('EndpointHanlder', {
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
                injector.get(FilterHandlerMethodResolver).addHandle(filter, invoker, order)
            });

            next()
        }
    }
});


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
        response?: 'body' | 'header' | 'response' | Type<Respond> | ((ctx: ServerEndpointContext, returnning: any) => void)
    }): MethodDecorator;
}

/**
 * ExecptionHandler decorator, for class. use to define the class as execption handle register in global execption filter.
 * @ExecptionHandler
 * 
 * @exports {@link ExecptionHandler}
 */
 export const ExecptionHandler: ExecptionHandler = EndpointHanlder;

