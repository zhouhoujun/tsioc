
import { Interceptor } from '@tsdi/core';
import { Abstract, Injectable,  Nullable, tokenId } from '@tsdi/ioc';
import { SocketOptions, BindOptions } from 'dgram';
import { ev, CatchInterceptor, LogInterceptor, RespondInterceptor, ProtocolServer, ProtocolServerOpts, ServerRequest, ServerResponse } from '@tsdi/transport';




/**
 * UDP server options.
 */
export interface CoapServerOpts {
    /**
     * Indicates whether half-opened UDP connections are allowed.
     * @default false
     */
    allowHalfOpen?: boolean | undefined;
    /**
     * Indicates whether the socket should be paused on incoming connections.
     * @default false
     */
    pauseOnConnect?: boolean | undefined;
}

/**
 * address.
 */
export interface Address {
    /**
     * port.
     */
    port: number;
    /**
     * address.
     */
    address?: string
}

/**
 * Coap server options.
 */
@Abstract()
export abstract class CoapServerOpts extends ProtocolServerOpts {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract headerSplit?: string;
    abstract encoding?: BufferEncoding;
    abstract serverOpts: SocketOptions;
    abstract bindOpts: BindOptions;
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
    bindOpts: {
        port: 3000,
        address: 'localhost'
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
