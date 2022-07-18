import { ClientOpts, ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { SocketConstructorOpts, NetConnectOpts } from 'net';
import { PacketProtocolOpts } from '../packet';
import { TcpRequest } from './request';
import { TcpEvent } from './response';

/**
 * tcp client options.
 */
@Abstract()
export abstract class TcpClientOpts extends ClientOpts<TcpRequest, TcpEvent> implements PacketProtocolOpts {
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
    abstract connectOpts: NetConnectOpts;
}

/**
 * tcp client interceptors.
 */
export const TCP_INTERCEPTORS = tokenId<Interceptor<TcpRequest, TcpEvent>[]>('TCP_INTERCEPTORS');
/**
 * tcp client interceptors.
 */
export const TCP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('TCP_EXECPTIONFILTERS');