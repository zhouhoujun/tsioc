import { Interceptor, ServerOpts, ListenOpts } from '@tsdi/core';
import { Abstract, ClassType, tokenId } from '@tsdi/ioc';
import { ConnectionOpts } from '../connection';
import { ContentOptions, SessionOptions } from '../middlewares';
import { MimeSource } from '../mime';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { StreamTransportStrategy } from '../strategy';
import { EventStrategy } from './connection';


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

    abstract transport?: ClassType<StreamTransportStrategy>;

    abstract event?: ClassType<EventStrategy>;
}


/**
 * Transport server interceptors.
 */
export const SERVER_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('SERVER_INTERCEPTORS');
