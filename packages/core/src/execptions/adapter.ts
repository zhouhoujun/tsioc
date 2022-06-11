import { Abstract } from '@tsdi/ioc';
import { TransportContext } from '../transport/context';

/**
 * respond adapter.
 */
@Abstract()
export abstract class RespondAdapter {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link TransportContext}.
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: TransportContext, value: T): void;
}

/**
 * respond adapter with response type.
 */
@Abstract()
export abstract class RespondTypeAdapter {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link TransportContext}.
     * @param responseType response type
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: TransportContext, responseType: 'body' | 'header' | 'response', value: T): void;
}