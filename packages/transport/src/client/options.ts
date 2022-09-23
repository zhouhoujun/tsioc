import { ClientOpts, EndpointBackend, ExecptionFilter, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, ClassType, tokenId } from '@tsdi/ioc';
import { TransportProtocol } from '../protocol';
import { ClientConnectionOpts, RequestStrategy } from './connection';

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
export abstract class TransportClientOpts extends ClientOpts {
    abstract keepalive?: number;
    /**
     * connect options.
     */
    abstract connectOpts?: Record<string, any>;
    abstract connectionOpts?: ClientConnectionOpts;
    /**
     * request opions.
     */
    abstract requestOpts?: SessionRequestOpts;

    abstract transport?: ClassType<TransportProtocol>;

    abstract request?: ClassType<RequestStrategy>;
    /**
     * backend.
     */
    abstract backend?: ClassType<EndpointBackend<TransportRequest, TransportEvent>>;
}

/**
 * client interceptors.
 */
export const CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('CLIENT_INTERCEPTORS');
/**
 * client execption filters.
 */
export const CLIENT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('CLIENT_EXECPTIONFILTERS');
