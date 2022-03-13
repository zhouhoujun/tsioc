import { Abstract, chain, Injectable, InvocationContext } from '@tsdi/ioc';
import { Observable, switchMap } from 'rxjs';
import { TransportRequest, TransportResponse } from './packet';
import { TransportContext, TransportContextFactory } from './context';
import { TransportHandler } from './handler';
import { Middlewarable, Middleware, MIDDLEWARES } from './middleware';
import { SERVEROPTION } from './server';

/**
 * transport server endpoint handler.
 */
@Abstract()
export abstract class TransportEndpoint<TRequest, TResponse> implements TransportHandler<TRequest, TResponse>  {
    /**
     * http transport handler.
     * @param req http request input.
     */
    abstract handle(req: TRequest): Observable<TResponse>;
}


/**
 * An injectable {@link TransportEndpoint} that applies multiple interceptors
 * to a request before passing it to the given {@link TransportEndpoint}.
 *
 * The interceptors are loaded lazily from the injector, to allow
 * interceptors to themselves inject classes depending indirectly
 * on `EndpointInterceptingHandler` itself.
 * @see `InterceptingEndpoint`
 */
@Injectable()
export class InterceptingEndpoint<TRequest extends TransportRequest, TResponse extends TransportResponse> implements TransportHandler<TRequest, TResponse>  {
    private chain!: Middlewarable;

    constructor(private endpoint: TransportEndpoint<TRequest, TResponse>, private context: InvocationContext) { }

    handle(request: TRequest): Observable<TResponse> {
        if (!this.chain) {
            const middlewares = this.context.resolve(MIDDLEWARES);
            this.chain = new ComposeEndpoint(middlewares);
        }
        return this.endpoint.handle(request)
            .pipe(
                switchMap(async reponse=> {
                    const args = this.context.resolve(SERVEROPTION);
                    const ctx = this.context.resolve(TransportContextFactory).create(this.context, {
                        reponse,
                        request,
                        arguments: args
                    });
                    await this.chain.handle(ctx);
                    return ctx.response as TResponse;
                })
            )
        
    }
}

/**
 * compose endpoint.
 */
export class ComposeEndpoint<T extends TransportContext = TransportContext> implements Middlewarable<T> {
    constructor(private endpoints: Middleware[]) { }
    handle(ctx: T, next: () => Promise<void>): Promise<void> {
        return chain(this.endpoints, ctx, next);
    }
}