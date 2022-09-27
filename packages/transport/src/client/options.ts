import { ClientOpts, EndpointBackend, ExecptionFilter, Interceptor, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, ClassType, tokenId, TypeOf } from '@tsdi/ioc';
import { ClientConnectionOpts, ClientRequsetOpts, RequestStrategy } from './connection';
import { StreamTransportStrategyOpts } from '../strategy';

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
    abstract requestOpts?: ClientRequsetOpts;

    abstract request?: ClassType<RequestStrategy>;

    abstract transport?: StreamTransportStrategyOpts;
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
