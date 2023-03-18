import { Abstract, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { EndpointContext } from './context';
import { Interceptor } from '../Interceptor';
import { Endpoint, runEndpoints } from '../Endpoint';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes/pipe';



/**
 * endpoint filter is a chainable behavior modifier for `endpoints`.
 */
@Abstract()
export abstract class Filter<TInput = any, TOutput = any> implements Interceptor<TInput, TOutput> {
    /**
     * the method to implemet interceptor filter.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * if no interceptors remain in the chain.
     * @param context request context.
     * @returns An observable of the event stream.
     */
    abstract intercept(input: TInput, next: Endpoint<TInput, TOutput>, context: EndpointContext): Observable<TOutput>;
}

/**
 * filter service.
 */
export interface FilterService {
    /**
     * use pipes.
     * @param guards 
     */
    usePipes(pipes: TypeOf<PipeTransform> | TypeOf<PipeTransform>[]): this;
    /**
     * use guards.
     * @param guards 
     */
    useGuards(guards: TypeOf<CanActivate> | TypeOf<CanActivate>[]): this;
    /**
     * use interceptor
     * @param interceptor 
     * @param order 
     */
    useInterceptor(interceptor: TypeOf<Interceptor> | TypeOf<Interceptor>[], order?: number): this;
    /**
     * use filter
     * @param filter 
     * @param order 
     */
    useFilter(filter: TypeOf<Filter> | TypeOf<Filter>[], order?: number): this;
}

/**
 * Endpoint handler method resolver.
 */
@Abstract()
export abstract class FilterHandlerResolver {
    /**
     * resolve filter hanlde.
     * @param filter 
     */
    abstract resolve<T>(filter: Type<T> | T | string): Endpoint[];
    /**
     * add filter handle.
     * @param filter filter type
     * @param endpoint filter endpoint.
     * @param order order.
     */
    abstract addHandle(filter: Type | string, endpoint: Endpoint, order?: number): this;
    /**
     * remove filter handle.
     * @param filter filter type.
     * @param endpoint filter endpoint.
     */
    abstract removeHandle(filter: Type | string, endpoint: Endpoint): this;
}


/**
 * run handlers.
 * @param ctx 
 * @param filter 
 * @returns 
 */
export function runHandlers(ctx: EndpointContext, input: any, filter: Type | string): Observable<any> {
    const handles = ctx.injector.get(FilterHandlerResolver).resolve(filter);
    return runEndpoints(handles, ctx, input, c => c.done === true)
}


@Abstract()
export abstract class Respond {

    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: EndpointContext, value: T): void;
}

/**
 * Execption respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param responseType response type
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: EndpointContext, responseType: 'body' | 'header' | 'response', value: T): void;
}

