import { Interceptor, Protocol, ServerOpts } from '@tsdi/core';
import { Abstract, tokenId, TypeOf } from '@tsdi/ioc';
import { ContentOptions, SessionOptions } from '../middlewares';
import { MimeSource } from '../mime';
import { ListenOpts } from '../stream';
import { ServerRequest } from './req';
import { ServerResponse } from './res';

@Abstract()
export abstract class ProtocolServerOpts<T = any> extends ServerOpts<ServerRequest, ServerResponse> {
    abstract proxy?: boolean;
    /**
     * protocol
     */
    abstract protocol?: TypeOf<Protocol>;
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
    abstract serverOpts?: Record<string, any>;
    abstract listenOpts: ListenOpts;
}


/**
 * Protocol server interceptors.
 */
export const PROTOTCOL_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('PROTOTCOL_SERV_INTERCEPTORS');
