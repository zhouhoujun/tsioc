import { Interceptor, ServerOpts, ListenOpts, TransportStrategyOpts } from '@tsdi/core';
import { Abstract, ClassType, tokenId, TypeOf } from '@tsdi/ioc';
import { ConnectionOpts } from '../connection';
import { ContentOptions, SessionOptions } from '../middlewares';
import { Readable, Writable } from 'stream';
import { MimeSource } from '../mime';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { EventStrategy } from '../stream/client/connection';
import { ServerTransportStrategy } from './strategy';

/**
 * transport server options.
 */
@Abstract()
export abstract class TransportServerOpts<T = any> extends ServerOpts<ServerRequest, ServerResponse> {
    abstract proxy?: boolean;
    /**
     * options of protocol.
     */
    abstract protocolOpts?: T;
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

    abstract event?: ClassType<EventStrategy>;
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
export const SERVER_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('SERVER_INTERCEPTORS');
