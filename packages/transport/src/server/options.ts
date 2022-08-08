import { Decoder, Encoder, Interceptor, Protocol, ServerOpts } from '@tsdi/core';
import { Abstract, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { Stream } from 'stream';
import { ContentOptions, SessionOptions } from '../middlewares';
import { MimeSource } from '../mime';
import { ServerRequest } from './req';
import { ServerResponse } from './res';

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

    /**
     * encoder input.
     */
     abstract encoder?: Type<Encoder<string | Buffer | Stream>>;
     /**
      * decoder input.
      */
     abstract decoder?: Type<Decoder<string | Buffer | Stream>>;
}


/**
 * Protocol server interceptors.
 */
export const PROTOTCOL_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('PROTOTCOL_SERV_INTERCEPTORS');
