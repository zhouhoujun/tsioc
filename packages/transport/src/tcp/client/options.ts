import { ClientOptions, ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { Socket, SocketConstructorOpts, NetConnectOpts } from 'net';
import { TcpRequest } from './request';
import { TcpEvent } from './response';

@Abstract()
export abstract class TcpClientOptions extends ClientOptions<TcpRequest, TcpEvent> {
    abstract encoding?: BufferEncoding;
    abstract headerSplit?: string;
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
