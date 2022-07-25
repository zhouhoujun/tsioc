import { Abstract } from '@tsdi/ioc';
import { TransportContext } from '../transport/context';

/**
 * Execption respond.
 */
@Abstract()
export abstract class ExecptionRespond {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link TransportContext}.
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: TransportContext, value: T): void;
}

/**
 * Execption respond adapter with response type.
 */
@Abstract()
export abstract class ExecptionTypedRespond {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link TransportContext}.
     * @param responseType response type
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: TransportContext, responseType: 'body' | 'header' | 'response', value: T): void;
}