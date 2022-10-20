import { Abstract } from '@tsdi/ioc';
import { ServerEndpointContext } from '../transport/context';
import { Respond } from '../transport/filter';

/**
 * Execption respond.
 */
@Abstract()
export abstract class ExecptionRespond extends Respond {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: ServerEndpointContext, value: T): void;
}

/**
 * Execption respond adapter with response type.
 */
@Abstract()
export abstract class ExecptionTypedRespond {
    /**
     * respond with execption handled data.
     * @param ctx transport context. instance of {@link ServerEndpointContext}.
     * @param responseType response type
     * @param value execption handled returnning value
     */
    abstract respond<T>(ctx: ServerEndpointContext, responseType: 'body' | 'header' | 'response', value: T): void;
}