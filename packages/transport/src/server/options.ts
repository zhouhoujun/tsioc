import { Interceptor, ServerOpts, ListenOpts, TransportStrategyOpts, Incoming, Outgoing } from '@tsdi/core';
import { Abstract, ClassType, tokenId, TypeOf } from '@tsdi/ioc';
import { ConnectionOpts } from '../connection';
import { ContentOptions, SessionOptions } from '../middlewares';
import { Readable, Writable } from 'stream';
import { MimeSource } from '../mime';
import { ServerTransportStrategy } from './strategy';


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

    abstract transport?: ServerTransportStrategyOpts;
}

/**
 * server transport strategy options.
 */
export interface ServerTransportStrategyOpts extends TransportStrategyOpts<Readable, Writable> {
    strategy: TypeOf<ServerTransportStrategy>;
}

/**
 * server transport interceptors.
 */
export const SERVER_TRANSPORT_INTERCEPTORS = tokenId<Interceptor<Readable, Writable>[]>('SERVER_TRANSPORT_INTERCEPTORS');


/**
 * Transport server interceptors.
 */
export const SERVER_INTERCEPTORS = tokenId<Interceptor<Incoming, Outgoing>[]>('SERVER_INTERCEPTORS');
