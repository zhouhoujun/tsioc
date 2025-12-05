import { Token, AbstractType } from '@tsdi/ioc';
import { AbstractRequest, ConfigableRequestHandler, PatternFormatter, RequestContext, RequestHandler, ResponseEvent } from '@tsdi/common';
// import { ClientBackend } from './handler';

/**
 * Client options.
 */
export interface ClientConfig<
    TInput extends AbstractRequest<any> = AbstractRequest<any>,
    TOutput extends ResponseEvent<any> = ResponseEvent<any>,
    > extends ConfigableRequestHandler<TInput, TOutput> {
    name?: string;
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
    // /**
    //  * connect options.
    //  */
    // connectOpts?: TConnOpts;
    /**
     * is microservice client or not.
     */
    microservice?: boolean;
    // /**
    //  * protocol
    //  */
    // protocol?: string;
    /**
     * client handler type.
     */
    handlerType?: AbstractType<RequestHandler>;

    // /**
    //  * transport backend.
    //  */
    // backend?: Token<ClientBackend> | ClientBackend;
    formatter?: Token<PatternFormatter>;
    /**
     * as default client or not.
     */
    asDefault?: boolean;
}
