
import { ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { ServerOpts as TcpSocketOptions } from 'net';
import { SocketOptions } from 'dgram';
import { CatchInterceptor, LogInterceptor, RespondInterceptor, ProtocolServer, ProtocolServerOpts, ServerRequest, ServerResponse, ListenOpts } from '@tsdi/transport';




/**
 * Coap server options.
 */
@Abstract()
export abstract class CoapServerOpts extends ProtocolServerOpts {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract baseOn?: 'tcp' | 'udp';
    abstract encoding?: BufferEncoding;
    abstract serverOpts?: SocketOptions | TcpSocketOptions;
}

/**
 * CoAP server interceptors.
 */
export const COAP_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('COAP_SERV_INTERCEPTORS');

/**
 * CoAP server execption filters.
 */
export const COAP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('COAP_EXECPTION_FILTERS');


const defOpts = {
    json: true,
    encoding: 'utf8',
    headerSplit: '#',
    interceptorsToken: COAP_SERV_INTERCEPTORS,
    execptionsToken: COAP_EXECPTION_FILTERS,
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
export class CoapServer extends ProtocolServer {


    constructor(@Nullable() options: CoapServerOpts) {
        super(options)
    }

    protected override getDefaultOptions() {
        return defOpts;
    }

}
