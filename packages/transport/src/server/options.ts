import { Decoder, Encoder, Interceptor, ServerOpts, ListenOpts } from '@tsdi/core';
import { Abstract, ClassType, tokenId } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { Stream } from 'stream';
import { ConnectionOpts } from '../connection';
import { ContentOptions, SessionOptions } from '../middlewares';
import { MimeSource } from '../mime';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { TransportProtocol } from '../packet';
import { EventStrategy } from './session';


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

    abstract transport?: ClassType<TransportProtocol>;

    abstract event?: ClassType<EventStrategy>;

    /**
     * encoder input.
     */
     abstract encoder?: ClassType<Encoder<string | Buffer | Stream>>;
     /**
      * decoder input.
      */
     abstract decoder?: ClassType<Decoder<string | Buffer | Stream>>;
}


/**
 * Transport server interceptors.
 */
export const SERVER_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('SERVER_INTERCEPTORS');
