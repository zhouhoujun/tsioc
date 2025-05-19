import { tokenId } from '@tsdi/ioc';
import { ExceptionFilter, ApplicationInterceptor } from '@tsdi/core';
import { ResponseEvent } from '@tsdi/common';
import { ClientConfig, ClientOpts } from '@tsdi/common/client';
import { OptionName } from 'coap-packet';
import { OptionValue } from 'coap';
import { CoapRequest } from './request';


// export interface CoapTransportOpts extends TransportOpts {
//     host?: string;
//     hostname?: string;
//     port?: number;
//     confirmable?: boolean;
//     observe?: 0 | 1 | boolean | string;
//     options?: Partial<Record<OptionName, OptionValue>>;
//     headers?: Partial<Record<OptionName, OptionValue>>;
//     proxyUri?: string;
//     multicast?: boolean;
//     multicastTimeout?: number;
//     retrySend?: number;
//     token?: Buffer;
//     contentFormat?: string | number;
//     accept?: string | number;
//     maxSize?: number;
// }

/**
 * client options.
 */
export interface CoapClientConfig extends ClientConfig   {

    
}

/**
 * Coap clinet options token.
 */
export const COAP_CLIENT_OPTS = tokenId<CoapClientConfig>('COAP_CLIENT_OPTS');

/**
 * Coap client interceptors token.
 */
export const COAP_CLIENT_INTERCEPTORS = tokenId<ApplicationInterceptor<CoapRequest<any>, ResponseEvent<any>>[]>('COAP_INTERCEPTORS');

/**
 * Coap client filters token.
 */
export const COAP_CLIENT_FILTERS = tokenId<ExceptionFilter[]>('COAP_FILTERS');
