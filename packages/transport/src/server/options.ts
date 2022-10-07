import { Interceptor, ServerOpts, ListenOpts, Incoming, Outgoing } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { ConnectionOpts } from '../connection';
import { ContentOptions, SessionOptions } from '../middlewares';
import { Readable, Writable } from 'stream';
import { MimeSource } from '../mime';


/**
 * transport server options.
 */
@Abstract()
export abstract class TransportServerOpts extends ServerOpts<Incoming, Outgoing> {
    abstract proxy?: boolean;
    /**
     * options of protocol.
     */
    abstract protocolOpts?: any;
    /**
     * max Connections.
     */
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
    abstract connectionOpts?: ConnectionOpts;
}


/**
 * server transport interceptors.
 */
export const SERVER_TRANSPORT_INTERCEPTORS = tokenId<Interceptor<Readable, Writable>[]>('SERVER_TRANSPORT_INTERCEPTORS');


/**
 * Transport server interceptors.
 */
export const SERVER_INTERCEPTORS = tokenId<Interceptor<Incoming, Outgoing>[]>('SERVER_INTERCEPTORS');
