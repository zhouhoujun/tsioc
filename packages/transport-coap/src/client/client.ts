import { ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { ProtocolClient, ProtocolClientOpts, TransportRequest,  } from '@tsdi/transport';
import { SocketOptions } from 'dgram';


@Abstract()
export abstract class CoapClientOpts extends ProtocolClientOpts {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract encoding?: BufferEncoding;
    abstract headerSplit?: string;
    abstract connectOpts?: SocketOptions;
}

/**
 * Coap client interceptors.
 */
export const COAP_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransitionEvent>[]>('COAP_INTERCEPTORS');

/**
 * Coap client interceptors.
 */
export const COAP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('COAP_EXECPTIONFILTERS');

const defaults = {
    json: true,
    headerSplit: '#',
    encoding: 'utf8',
    interceptorsToken: COAP_INTERCEPTORS,
    execptionsToken: COAP_EXECPTIONFILTERS,
    interceptors: [
    ],
    address: {
        port: 3000,
        hostname: 'localhost'
    }
} as CoapClientOpts;



/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends ProtocolClient {

    constructor(@Nullable() option: CoapClientOpts) {
        super(option);
    }

    protected override getDefaultOptions() {
        return defaults;
    }
}
