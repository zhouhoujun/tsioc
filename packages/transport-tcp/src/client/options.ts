import { ExecptionFilter, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { TransportClientOpts } from '@tsdi/transport';
import { SocketConstructorOpts, NetConnectOpts } from 'net';
import { ConnectionOptions } from 'tls';



/**
 * tcp client options.
 */
@Abstract()
export abstract class TcpClientOpts extends TransportClientOpts<TransportRequest, TransportEvent> {
    /**
     * packet size limit.
     */
    abstract sizeLimit?: number;
    /**
     * packet buffer encoding.
     */
    abstract encoding?: BufferEncoding;
    /**
     * packet delimiter code.
     */
    abstract delimiter?: string;
    /**
     * socket options.
     */
    abstract socketOpts?: SocketConstructorOpts;
    /**
     * connect options.
     */
    abstract connectOpts?: NetConnectOpts | ConnectionOptions;
}

/**
 * tcp client interceptors.
 */
export const TCP_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('TCP_CLIENT_INTERCEPTORS');
/**
 * tcp client execption filters.
 */
export const TCP_CLIENT_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('TCP_CLIENT_EXECPTION_FILTERS');
