import { ClientOptions, ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { SocketConstructorOpts, NetConnectOpts } from 'net';
import { PacketProtocolOpions } from '../packet';
import { TcpRequest } from './request';
import { TcpEvent } from './response';

@Abstract()
export abstract class TcpClientOptions extends ClientOptions<TcpRequest, TcpEvent> implements PacketProtocolOpions {
    /**
     * buffer encoding.
     */
    abstract encoding?: BufferEncoding;
    /**
     * package delimiter code.
     */
    abstract delimiter?: string;
    abstract socketOpts?: SocketConstructorOpts;
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
