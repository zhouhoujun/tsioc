import { ClientOpts, Decoder, Encoder, EndpointBackend, ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, tokenId, Type } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { Stream } from 'stream';
import { TransportRequest } from './request';
import { TransportEvent } from './response';

export interface SessionRequestOpts extends Record<string, any> {
    endStream?: boolean | undefined;
    exclusive?: boolean | undefined;
    parent?: number | undefined;
    weight?: number | undefined;
    waitForTrailers?: boolean | undefined;
    signal?: AbortSignal | undefined;
}

/**
 * Transport client options.
 */
@Abstract()
export abstract class TransportClientOpts extends ClientOpts<TransportRequest, TransportEvent> {
    /**
     * packet size limit.
     */
    abstract sizeLimit?: number;
    /**
     * packet buffer encoding.
     */
    abstract encoding?: BufferEncoding;
    /**
     * connect options.
     */
    abstract connectOpts?: Record<string, any>;
    /**
     * request opions.
     */
    abstract requestOpts?: SessionRequestOpts;
    /**
     * backend.
     */
    abstract backend?: Type<EndpointBackend<TransportRequest, TransportEvent>>;

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
 * client interceptors.
 */
export const CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('CLIENT_INTERCEPTORS');
/**
 * client execption filters.
 */
export const CLIENT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('CLIENT_EXECPTIONFILTERS');
