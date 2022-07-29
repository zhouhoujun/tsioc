import { ClientOpts, EndpointBackend, ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, tokenId, Type } from '@tsdi/ioc';
import { SocketConstructorOpts, NetConnectOpts } from 'net';
import { TransportRequest } from './request';
import { TransportEvent } from './response';

/**
 * client options.
 */
@Abstract()
export abstract class ProtocolClientOpts extends ClientOpts<TransportRequest, TransportEvent> {
    /**
     * packet size limit.
     */
    abstract sizeLimit?: number;
    /**
     * packet buffer encoding.
     */
    abstract encoding?: BufferEncoding;
    /**
     * socket options.
     */
    abstract socketOpts?: SocketConstructorOpts;
    /**
     * connect options.
     */
    abstract connectOpts: NetConnectOpts;

    abstract backend?: Type<EndpointBackend<TransportRequest, TransportEvent>>
}

/**
 * client interceptors.
 */
export const CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('CLIENT_INTERCEPTORS');
/**
 * client execption filters.
 */
export const CLIENT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('CLIENT_EXECPTIONFILTERS');
