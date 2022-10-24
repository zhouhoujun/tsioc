import { Interceptor, ServerOpts, ListenOpts, Incoming, Outgoing, ExecptionFilter } from '@tsdi/core';
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
 * send interceptors token of server.
 */
export const SERVER_SEND_INTERCEPTORS = tokenId<Interceptor<Writable, Readable>[]>('SERVER_SEND_INTERCEPTORS');
/**
 * receive interceptors token of server.
 */
export const SERVER_RECEIVE_INTERCEPTORS = tokenId<Interceptor<Writable, Readable>[]>('CLIENT_RECEIVE_INTERCEPTORS');

/**
 * Transport interceptors token of server.
 */
export const SERVER_INTERCEPTORS = tokenId<Interceptor<Incoming, Outgoing>[]>('SERVER_INTERCEPTORS');

/**
 * execption filters token of server.
 */
export const SERVER_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('SERVER_EXECPTION_FILTERS');