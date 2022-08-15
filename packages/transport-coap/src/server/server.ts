
import { ExecptionFilter, Interceptor, MiddlewareType } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import {
    CatchInterceptor, LogInterceptor, RespondInterceptor, TransportServer,
    TransportServerOpts, ServerRequest, ServerResponse
} from '@tsdi/transport';
import { ServerOpts } from 'net';
import { SocketOptions } from 'dgram';
import { CoapServerBuilder } from './builder';


/**
 * Coap server options.
 */
@Abstract()
export abstract class CoapServerOpts extends TransportServerOpts {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract baseOn?: 'tcp' | 'udp';
    abstract encoding?: BufferEncoding;
    abstract serverOpts?: SocketOptions | ServerOpts;
}

/**
 * CoAP server interceptors.
 */
export const COAP_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('COAP_SERV_INTERCEPTORS');

/**
 * CoAP server execption filters.
 */
export const COAP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('COAP_EXECPTION_FILTERS');
/**
 * CoAP middlewares.
 */
export const COAP_MIDDLEWARES = tokenId<MiddlewareType[]>('COAP_MIDDLEWARES');

const defOpts = {
    json: true,
    encoding: 'utf8',
    builder: CoapServerBuilder,
    interceptorsToken: COAP_SERV_INTERCEPTORS,
    execptionsToken: COAP_EXECPTION_FILTERS,
    middlewaresToken: COAP_MIDDLEWARES,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    listenOpts: {
        port: 4000,
        host: 'localhost'
    }
} as CoapServerOpts;


/**
 * Coap server.
 */
@Injectable()
export class CoapServer extends TransportServer {


    constructor(@Nullable() options: CoapServerOpts) {
        super(options)
    }

    protected override getDefaultOptions() {
        return defOpts;
    }

}
