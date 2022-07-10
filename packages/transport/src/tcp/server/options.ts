import { Interceptor, ServerOptions } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { ListenOptions, ServerOpts as TcpServerOpts } from 'net';
import { SessionOptions, ContentOptions } from '../../middlewares';

import { MimeSource } from '../../mime';
import { TcpServRequest } from './request';
import { TcpServResponse } from './response';


/**
 * TCP server options.
 */
@Abstract()
export abstract class TcpServerOptions extends ServerOptions<TcpServRequest, TcpServResponse> {
    /**
     * header split code.
     */
    abstract headerSplit?: string;
    abstract maxConnections?: number;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract encoding?: BufferEncoding;
    abstract mimeDb?: Record<string, MimeSource>;
    abstract content?: boolean | ContentOptions;
    abstract session?: boolean | SessionOptions;
    abstract serverOpts?: TcpServerOpts | undefined;
    abstract listenOptions: ListenOptions;
}

/**
 * Tcp server interceptors.
 */
export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor<TcpServRequest, TcpServResponse>[]>('TCP_SERV_INTERCEPTORS');
