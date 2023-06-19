import { Client } from '@grpc/grpc-js';
import { ConfigableHandlerOptions, ExecptionFilter, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { Agent, AgentOptions, OptionValue } from 'coap';
import { CoapMethod, OptionName } from 'coap-packet';



export interface CoapClientOpts extends ConfigableHandlerOptions<TransportRequest, TransportEvent>  {
    encoding?: BufferEncoding;
    connectOpts: AgentOptions;
    /**
     * transport session options.
     */
    transportOpts?: {
        host?: string;
        hostname?: string;
        port?: number;
        method?: CoapMethod;
        confirmable?: boolean;
        observe?: 0 | 1 | boolean | string;
        pathname?: string;
        query?: string;
        options?: Partial<Record<OptionName, OptionValue>>;
        headers?: Partial<Record<OptionName, OptionValue>>;
        agent?: Agent | false;
        proxyUri?: string;
        multicast?: boolean;
        multicastTimeout?: number;
        retrySend?: number;
        token?: Buffer;
        contentFormat?: string | number;
        accept?: string | number;
    };
    
}

export interface CoapClientsOpts extends CoapClientOpts {
    client: Token<Client>;
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
