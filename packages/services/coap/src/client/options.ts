import { tokenId } from '@tsdi/ioc';
import { ExecptionFilter, Interceptor } from '@tsdi/core';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { Agent, OptionValue } from 'coap';
import { OptionName } from 'coap-packet';



export interface CoapClientOpts extends ClientOpts  {
    /**
     * transport session options.
     */
    transportOpts?: {
        hostname?: string;
        port?: number;
        confirmable?: boolean;
        observe?: 0 | 1 | boolean | string;
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
        maxSize?: number;
    };
    
}


export const COAP_CLIENT_OPTS = tokenId<CoapClientOpts>('COAP_CLIENT_OPTS');

/**
 * Coap client interceptors.
 */
export const COAP_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('COAP_INTERCEPTORS');

/**
 * Coap client filters.
 */
export const COAP_CLIENT_FILTERS = tokenId<ExecptionFilter[]>('COAP_FILTERS');
