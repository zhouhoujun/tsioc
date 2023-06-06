import { ConfigableHandlerOptions, ExecptionFilter, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { AgentOptions } from 'coap';



export interface CoapClientOpts extends ConfigableHandlerOptions<TransportRequest, TransportEvent>  {
    /**
     * is json or not.
     */
    json?: boolean;
    encoding?: BufferEncoding;
    connectOpts: AgentOptions;
}

export const COAP_CLIENT_OPTS = tokenId<CoapClientOpts>('COAP_CLIENT_OPTS');

/**
 * Coap client interceptors.
 */
export const COAP_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('COAP_INTERCEPTORS');

/**
 * Coap client filters.
 */
export const COAP_FILTERS = tokenId<ExecptionFilter[]>('COAP_FILTERS');
