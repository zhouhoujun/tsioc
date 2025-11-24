import { Abstract } from '@tsdi/ioc';
import { RequestHandler } from '@tsdi/common';
import { TransportContext } from './context';
import { Observable } from 'rxjs';


/**
 * mesaage transport handler.
 */
@Abstract()
export abstract class TransportHandler<TInput = any, TOutput = any> implements RequestHandler<TInput, TOutput, TransportContext> {
    /**
     * mesaage transport handler.
     * @param intput the request message input.
     */
    abstract handle(intput: TInput, context: TransportContext): Observable<TOutput>;
}

/**
 * mesaage transport backend handler.
 */
@Abstract()
export abstract class TransportBackend<TInput = any, TOutput = any> implements TransportHandler<TInput, TOutput> {
    /**
     * http transport handler.
     * @param intput the message input.
     * @param context request with context for interceptor
     */
    abstract handle(intput: TInput, context: TransportContext): Observable<TOutput>;
}
