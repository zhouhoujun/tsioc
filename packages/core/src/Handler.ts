import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Handler is the fundamental building block of servers and clients.
 */
@Abstract()
export abstract class Handler<TInput = any, TOutput = any> {
    /**
     * transport endpoint handle.
     * @param input request input.
     */
    abstract handle(input: TInput): Observable<TOutput>;
}


/**
 * Handler is the fundamental building block of servers and clients.
 */
@Abstract()
export abstract class Backend<TInput = any, TOutput = any> implements Handler<TInput, TOutput> {
    /**
     * transport endpoint handle.
     * @param input request input.
     */
    abstract handle(input: TInput): Observable<TOutput>;
}