
import { Interceptor } from '@tsdi/core';
import { Abstract, Injectable,  Nullable, tokenId } from '@tsdi/ioc';
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
    abstract headerSplit?: string;
    abstract encoding?: BufferEncoding;
    abstract serverOpts?: SocketOptions;
}

/**
 * COAP server interceptors.
 */
export const COAP_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('COAP_SERV_INTERCEPTORS');

const defOpts = {
    json: true,
    encoding: 'utf8',
    headerSplit: '#',
    interceptorsToken: COAP_SERV_INTERCEPTORS,
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
