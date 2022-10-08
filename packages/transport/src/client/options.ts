import { ClientOpts, EndpointBackend, ExecptionFilter, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, ClassType, EMPTY_OBJ, tokenId, TypeOf } from '@tsdi/ioc';
import { Readable, Writable } from 'stream';
import { ConnectionOpts } from '../connection';

/**
 * Transport client options.
 */
@Abstract()
export abstract class TransportClientOpts extends ClientOpts {
    abstract keepalive?: number;
    /**
     * connect options.
     */
    abstract connectOpts?: Record<string, any>;
    abstract connectionOpts?: ConnectionOpts;
    /**
     * request opions.
     */
    abstract requestOpts?: Record<string, any>;
    /**
     * backend.
     */
    abstract backend?: TypeOf<EndpointBackend<TransportRequest, TransportEvent>>;
}


export class RequestStauts {
    public highWaterMark: number;
    public insecureParser: boolean;
    public referrerPolicy: ReferrerPolicy;
    readonly compress: boolean;
    constructor(init: {
        compress?: boolean;
        follow?: number;
        counter?: number;
        highWaterMark?: number;
        insecureParser?: boolean;
        referrerPolicy?: ReferrerPolicy;
        redirect?: 'manual' | 'error' | 'follow' | '';
    } = EMPTY_OBJ) {
        this.compress = init.compress ?? false;
        this.highWaterMark = init.highWaterMark ?? 16384;
        this.insecureParser = init.insecureParser ?? false;
        this.referrerPolicy = init.referrerPolicy ?? '';
    }
}


/**
 * client send interceptors token.
 */
export const CLIENT_SEND_INTERCEPTORS = tokenId<Interceptor<Writable, Readable>[]>('CLIENT_SEND_INTERCEPTORS');
/**
 * client receive interceptors token.
 */
export const CLIENT_RECEIVE_INTERCEPTORS = tokenId<Interceptor<Writable, Readable>[]>('CLIENT_RECEIVE_INTERCEPTORS');
/**
 * client interceptors token.
 */
export const CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('CLIENT_INTERCEPTORS');
/**
 * client execption filters token.
 */
export const CLIENT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('CLIENT_EXECPTIONFILTERS');
