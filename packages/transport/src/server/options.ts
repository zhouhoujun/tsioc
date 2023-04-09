import { Interceptor, EndpointOptions, ListenOpts, ExecptionFilter, Incoming, Outgoing } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { ConnectionOpts } from '../connection';
import { ContentOptions, SessionOptions } from '../middlewares';
import { MimeSource } from '../mime';

/**
 * transport server options.
 */
@Abstract()
export abstract class TransportServerOpts<TRequest = Incoming, TResponse = Outgoing> implements EndpointOptions<TRequest> {
    /**
     * options of protocol.
     */
    abstract protocolOpts?: any;
    /**
     * max Connections.
     */
    abstract maxConnections?: number;
    abstract hasRequestEvent?: boolean;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract encoding?: BufferEncoding;
    abstract mimeDb?: Record<string, MimeSource>;
    abstract content?: boolean | ContentOptions;
    abstract session?: boolean | SessionOptions;
    abstract serverOpts?: Record<string, any>;
    abstract listenOpts?: ListenOpts;
    abstract connectionOpts?: ConnectionOpts;
}



/**
 * Transport interceptors token of server.
 */
export const SERVER_INTERCEPTORS = tokenId<Interceptor<Incoming, Outgoing>[]>('SERVER_INTERCEPTORS');

/**
 * execption filters token of server.
 */
export const SERVER_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('SERVER_EXECPTION_FILTERS');