
import { createDecorator, Decors, isClass, isFunction, lang, promisify, ReflectiveFactory, Type } from '@tsdi/ioc';
import { Respond, EndpointHandlerMethodResolver, TypedRespond } from './filter';
import { ServerEndpointContext } from './context';
import { CanActivate } from './guard';
import { ForbiddenExecption } from './execptions';

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
     * route guards.
     */
    guards?: Type<CanActivate>[];
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
    (filter: Type | string, option?: {

        /**
         * route guards.
         */
        guards?: Type<CanActivate>[];
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
                const { filter, order, guards, response } = decor.metadata;
                const invoker = factory.createInvoker(decor.propertyKey);
                if (guards && guards.length) {
                    invoker.before(async (ctx, args) => {
                        const endpCtx = ctx.resolve(ServerEndpointContext);
                        if (!(await lang.some(
                            guards.map(token => () => promisify(factory.resolve(token)?.canActivate(endpCtx))),
                            vaild => vaild === false))) {
                            throw new ForbiddenExecption();
                        }
                    })

                }
                if (response) {
                    if (isClass(response)) {
                        invoker.afterReturnning((ctx, value) => {
                            ctx.resolve(response).respond(ctx.resolve(ServerEndpointContext), value);
                        })
                    } else if (isFunction(response)) {
                        invoker.afterReturnning((ctx, value) => {
                            response(ctx.resolve(ServerEndpointContext), value);
                        })
                    } else {
                        invoker.afterReturnning((ctx, value) => {
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

