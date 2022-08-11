import { Decoder, Encoder, Interceptor, Protocol, ServerOpts } from '@tsdi/core';
import { Abstract, ClassType, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { Stream } from 'stream';
import { ConnectionOpts } from '../connection';
import { ContentOptions, SessionOptions } from '../middlewares';
import { MimeSource } from '../mime';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { ServerBuilder } from './stream';

/**
 * Listen options.
 */
@Abstract()
export abstract class ListenOpts {

    /**
    * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
    */
    signal?: AbortSignal | undefined;
    port?: number | undefined;
    host?: string | undefined;
    backlog?: number | undefined;
    path?: string | undefined;
    exclusive?: boolean | undefined;
    readableAll?: boolean | undefined;
    writableAll?: boolean | undefined;
    /**
     * @default false
     */
    ipv6Only?: boolean | undefined;
}


@Abstract()
export abstract class TransportServerOpts<T = any> extends ServerOpts<ServerRequest, ServerResponse> {
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
    abstract connectionOpts?: ConnectionOpts;

    abstract builder?: ClassType<ServerBuilder>;

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
