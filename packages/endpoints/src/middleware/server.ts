import { Abstract, ProvdierOf } from '@tsdi/ioc';
import { EndpointService } from '@tsdi/core';
import { RequestPacket, ResponsePacket } from '@tsdi/common';
import { Server } from '../Server';
import { MiddlewareEndpoint } from './middleware.endpoint';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { TransportContext } from '../TransportContext';


/**
 * Server with middleware
 */
@Abstract()
export abstract class MiddlewareServer<TRequest = RequestPacket, TResponse = ResponsePacket> extends Server<TRequest, TResponse> implements EndpointService, MiddlewareService {

    abstract get endpoint(): MiddlewareEndpoint<TransportContext<TRequest, TResponse>, TResponse>;

    use(middlewares: ProvdierOf<MiddlewareLike<TransportContext<TRequest, TResponse>>> | ProvdierOf<MiddlewareLike<TransportContext<TRequest, TResponse>>>[], order?: number): this {
        this.endpoint.use(middlewares, order);
        return this;
    }

}
