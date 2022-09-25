import { ExecptionFilter, Interceptor, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { ClientConnection, parseToDuplex, RequestStrategy, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Packet } from 'coap-packet';
import * as dgram from 'dgram';
import * as net from 'net'
import { Duplex } from 'stream';
import { CoapTransportStrategy } from '../transport';


@Abstract()
export abstract class CoapClientOpts extends TransportClientOpts {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract encoding?: BufferEncoding;
    abstract baseOn?: 'tcp' | 'udp';
    abstract connectOpts: dgram.SocketOptions | net.NetConnectOpts;
}

/**
 * Coap client interceptors.
 */
export const COAP_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('COAP_INTERCEPTORS');

/**
 * Coap client interceptors.
 */
export const COAP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('COAP_EXECPTIONFILTERS');

const defaults = {
    interceptorsToken: COAP_INTERCEPTORS,
    execptionsToken: COAP_EXECPTIONFILTERS,
    transport: CoapTransportStrategy,
    address: {
        port: 3000,
        hostname: 'localhost'
    },
    connectOpts: {
        type: 'udp4'
    }
} as CoapClientOpts;



/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends TransportClient<RequestOptions, CoapClientOpts> {

    constructor(@Nullable() option: CoapClientOpts) {
        super(option);
    }

    protected override getDefaultOptions() {
        return defaults;
    }

    protected override createDuplex(opts: CoapClientOpts): Duplex {
        const socket = opts.baseOn === 'tcp' ? net.connect(opts.connectOpts as net.NetConnectOpts) : parseToDuplex(dgram.createSocket(opts.connectOpts as dgram.SocketOptions));
        return socket;
    }
}
