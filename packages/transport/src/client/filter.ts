import { Handler, Filter } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';


@Abstract()
export abstract class ClientFinalizeFilter<TInput = any, TOutput = any> extends Filter<TInput, TOutput> {
    /**
     * the method to implemet interceptor filter.
     * @param input  request input.
     * @param next The next interceptor in the chain, or the backend
     * if no interceptors remain in the chain.
     * @returns An observable of the event stream.
     */
    abstract intercept(input: TInput, next: Handler<TInput, TOutput>): Observable<TOutput>;
}
