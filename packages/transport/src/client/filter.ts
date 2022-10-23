import { ClientContext, Endpoint, EndpointFilter } from '@tsdi/core'
import { Abstract } from '@tsdi/ioc'
import { Observable } from 'rxjs'


@Abstract()
export abstract class ClientInterceptorFinalizeFilter <TInput = any, TOutput = any>  extends EndpointFilter<TInput, TOutput> {
    /**
     * the method to implemet interceptor filter.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @param context request context.
     * @returns An observable of the event stream.
     */
    abstract intercept(input: TInput, next: Endpoint<TInput, TOutput>, context: ClientContext): Observable<TOutput>;
}
