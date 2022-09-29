import { ClientOpts, EndpointBackend, ExecptionFilter, Interceptor, TransportEvent, TransportRequest, TransportStrategyOpts } from '@tsdi/core';
import { Abstract, ClassType, tokenId, TypeOf } from '@tsdi/ioc';
import { Readable, Writable } from 'stream';
import { ConnectionOpts } from '../connection';
import { ClientTransportStrategy } from './strategy';

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


    abstract transport?: ClientTransportStrategyOpts;
    /**
     * backend.
     */
    abstract backend?: ClassType<EndpointBackend<TransportRequest, TransportEvent>>;
}




/**
 * client transport strategy options.
 */
export interface ClientTransportStrategyOpts extends TransportStrategyOpts<Writable, Readable> {
    strategy: TypeOf<ClientTransportStrategy>;
}

/**
 * client transport interceptors.
 */
export const CLIENT_TRANSPORT_INTERCEPTORS = tokenId<Interceptor<Writable, Readable>[]>('CLIENT_TRANSPORT_INTERCEPTORS');
/**
 * client interceptors.
 */
export const CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('CLIENT_INTERCEPTORS');
/**
 * client execption filters.
 */
export const CLIENT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('CLIENT_EXECPTIONFILTERS');
