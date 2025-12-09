import { Token, ProvdierOf } from '@tsdi/ioc';
import { AbstractRequest, PatternFormatter, RequestHandlerOptions, RequestInterceptorLike, ResponseEvent, TransportConfig } from '@tsdi/common';


/**
 * Client options.
 */
export interface ClientConfig<
    TInput extends AbstractRequest<any> = AbstractRequest<any>,
    TOutput extends ResponseEvent<any> = ResponseEvent<any>,
> extends RequestHandlerOptions, TransportConfig {
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


    transfers?: ProvdierOf<RequestInterceptorLike[]>;

    transfersToken?: Token<RequestInterceptorLike[]>;
}
