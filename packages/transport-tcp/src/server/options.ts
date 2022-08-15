import { Interceptor, ServerOpts } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { SessionOptions, ContentOptions, MimeSource, TransportServerOpts } from '@tsdi/transport';
import { ListenOptions, ServerOpts as NetServerOpts } from 'net';
import { PacketProtocolOpts } from '../packet';
import { TcpServRequest } from './request';
import { TcpServResponse } from './response';


/**
 * TCP server options.
 */
@Abstract()
export abstract class TcpServerOpts extends TransportServerOpts implements PacketProtocolOpts  {
    /**
     * packet size limit.
     */
    abstract sizeLimit?: number;
    /**
     * packet delimiter code.
     */
    abstract delimiter?: string;
    abstract maxConnections?: number;
    abstract proxy?: boolean;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract encoding?: BufferEncoding;
    abstract mimeDb?: Record<string, MimeSource>;
    abstract content?: boolean | ContentOptions;
    abstract session?: boolean | SessionOptions;
    abstract serverOpts?: NetServerOpts | undefined;
    abstract listenOpts: ListenOptions;
}

/**
 * Tcp server interceptors.
 */
export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor<TcpServRequest, TcpServResponse>[]>('TCP_SERV_INTERCEPTORS');
