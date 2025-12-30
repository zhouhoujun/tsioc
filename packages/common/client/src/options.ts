import { ProvdierOf, Token } from '@tsdi/ioc';
import { AbstractRequest, PatternFormatter, RequestHandlerOptions, ResponseEvent, ResponseFactory, TransferConfig, TransferSide } from '@tsdi/common';


/**
 * Client options.
 */
export interface ClientConfig<
    TInput extends AbstractRequest<any> = AbstractRequest<any>,
    TOutput extends ResponseEvent<any> = ResponseEvent<any>,
> extends RequestHandlerOptions, TransferConfig {

    side: TransferSide.client;
    /**
     * url
     */
    url?: string;
    /**
     * timeout
     */
    timeout?: number;
    /**
     * authority base url.
     */
    authority?: string;
    /**
     * is microservice client or not.
     */
    microservice?: boolean;

    // /**
    //  * transport backend.
    //  */
    // backend?: Token<ClientBackend> | ClientBackend;
    formatter?: Token<PatternFormatter>;
    /**
     * as default client or not.
     */
    asDefault?: boolean;

    payloadKey?: 'body' | 'payload';

}
