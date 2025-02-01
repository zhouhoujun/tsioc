import { ProvdierOf, Type } from '@tsdi/ioc';
import { TransportOptions } from '@tsdi/common/transport';
import { RequestHandlerOptions } from './AbstractRequestHandler';
import { SessionOptions } from './Session';
import { ContentOptions } from './interceptors/content';
import { RouteOpts } from './router/router.module';
import { ServerTransportFactory } from './transport';
import { RequestHandler } from './RequestHandler';


export interface ProxyOpts {
    proxyIpHeader: string;
    maxIpsCount?: number;
}

/**
 * server options
 */
export interface ServerOpts<TSerOpts = any> extends RequestHandlerOptions<any> {
    /**
     * request timeout.
     */
    timeout?: number;
    session?: boolean | SessionOptions;
    content?: ContentOptions;
    serverOpts?: TSerOpts;
    /**
     * is microservice or not.
     */
    microservice?: boolean;

    /**
     * server request handler type
     */
    handlerType?: Type<RequestHandler>;

    /**
     * service transport factory.
     */
    transportFactory?: ProvdierOf<ServerTransportFactory>;
    /**
     * transport options.
     */
    transportOptions?: TransportOptions,

    majorVersion?: number;
    server?: any;
    /**
     * send detail error message to client or not. 
     */
    detailError?: boolean;

    listenOpts?: any;
    /**
     * routes config.
     */
    routes?: RouteOpts;

    proxy?: ProxyOpts;

    protocol?: string;

    secure?: boolean;
}

