import { Interceptor, ServerOpts } from '@tsdi/core';
import { Abstract, tokenId, TypeOf } from '@tsdi/ioc';
import { ListenOptions, ServerOpts as NetServerOpts } from 'net';
import { ContentOptions, SessionOptions } from '../middlewares';
import { MimeSource } from '../mime';
import { TransportProtocol } from '../protocol';
import { ServerRequest } from './req';
import { ServerResponse } from './res';


@Abstract()
export abstract class ProtocolServerOpts<T=any> extends ServerOpts<ServerRequest, ServerResponse> {
    abstract proxy?: boolean;
    /**
     * protocol
     */
    abstract protocol?: TypeOf<TransportProtocol>;
    /**
     * options of protocol.
     */
    abstract protocolOpts?: T;
    /**
     * packet size limit.
     */
    abstract sizeLimit?: number;
    /**
     * packet delimiter code.
     */
    abstract delimiter?: string;
    abstract maxConnections?: number;
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
 * Protocol server interceptors.
 */
export const PROTOTCOL_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('PROTOTCOL_SERV_INTERCEPTORS');
