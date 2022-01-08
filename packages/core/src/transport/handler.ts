import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Transport handler.
 */
 @Abstract()
 export abstract class TransportHandler<TInput = any, TOutput = any> {
     /**
      * transport handler.
      * @param input 
      */
     abstract handle(input: TInput): Observable<TOutput>;
 }

/**
 * A final {@link TransportHandler} which will dispatch the request via browser HTTP APIs to a backend.
 *
 * Interceptors sit between the `Client|Server` interface and the `TransportBackend`.
 *
 * When injected, `TransportBackend` dispatches requests directly to the backend, without going
 * through the interceptor chain.
 */
export abstract class TransportBackend<TInput = any, TOutput = any> implements TransportHandler<TInput, TOutput> {
    /**
     * transport handler.
     * @param input 
     */
    abstract handle(input: TInput): Observable<TOutput>;
}
