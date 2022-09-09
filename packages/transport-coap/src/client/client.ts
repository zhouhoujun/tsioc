import { ExecptionFilter, Interceptor, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { ClientSession, parseToDuplex, RequestStrategy, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Packet } from 'coap-packet';
import * as dgram from 'dgram';
import * as net from 'net'
import { CoapProtocol } from '../protocol';


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
    interceptors: [
    ],
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

    protected createConnection(opts: CoapClientOpts): ClientSession {
        const socket = opts.baseOn === 'tcp' ? net.connect(opts.connectOpts as net.NetConnectOpts) : parseToDuplex(dgram.createSocket(opts.connectOpts as dgram.SocketOptions));
        const transport = this.context.get(opts.transport ?? CoapProtocol);
        const strategy = this.context.get(opts.request ?? RequestStrategy);
        const client = new ClientSession(socket, transport, opts.connectionOpts, strategy);
        return client;
    }
}
