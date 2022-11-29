
import { createDecorator, Decors, InvocationContext, isClass, isFunction, isObservable, isPromise, lang, pomiseOf, ReflectiveFactory, Type } from '@tsdi/ioc';
import { Respond, EndpointHandlerMethodResolver, TypedRespond } from './filter';
import { ServerEndpointContext } from './context';
import { CanActivate } from './guard';
import { ForbiddenExecption } from './execptions';
import { map } from 'rxjs';

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
            const typeRef = ctx.typeRef;
            const decors = typeRef.getDecorDefines<EndpointHandlerMetadata>(ctx.currDecor, Decors.method);
            const injector = ctx.injector;
            const factory = injector.get(ReflectiveFactory).create(typeRef, injector);
            decors.forEach(decor => {
                const { filter, order, guards, response } = decor.metadata;


                let after: (ctx: InvocationContext, endpCtx: ServerEndpointContext, value: any) => void;
                if (response) {
                    if (isClass(response)) {
                        after = (ctx, endpCtx, value) => ctx.resolve(response).respond(endpCtx, value);
                    } else if (isFunction(response)) {
                        after = (ctx, endpCtx, value) => response(endpCtx, value);
                    } else {
                        after = (ctx, endpCtx, value) => ctx.resolve(TypedRespond).respond(endpCtx, response, value);
                    }
                }

                const invoker = factory.createInvoker(decor.propertyKey, true, async (ctx, run) => {
                    const endpCtx = ctx instanceof ServerEndpointContext? ctx: ctx.resolve(ServerEndpointContext);
                    if (guards && guards.length) {
                        if (!(await lang.some(
                            guards.map(token => () => pomiseOf(factory.resolve(token)?.canActivate(endpCtx))),
                            vaild => vaild === false))) {
                            throw new ForbiddenExecption();
                        }
                    }
                    const value = run(ctx);
                    if (after) {
                        if (isPromise(value)) {
                            return value.then((v) => {
                                lang.immediate(after, ctx, endpCtx, v);
                                return v;
                            });
                        }
                        if (isObservable(value)) {
                            return value.pipe(
                                map(v => {
                                    lang.immediate(after, ctx, endpCtx, v);
                                    return v;
                                })
                            )
                        }
                        lang.immediate(after, ctx, endpCtx, value);
                    }
                    return value;
                });

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

