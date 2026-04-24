import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY, RequestInitOpts } from '@tsdi/common/client';
import { Pattern, RequestContext, ResponseEvent } from '@tsdi/common';
import { NatsRequest } from '../request';
import { NatsClientConfig } from '../options';

/**
 * NATS client transport strategy.
 * Minimal concrete implementation of IClientTransportStrategy for NATS.
 */
@Injectable()
export class NatsTransportStrategy
    implements IClientTransportStrategy<NatsRequest<any>, ResponseEvent<any>, NatsClientConfig> {

    private _connected = false;

    /** Connect to the transport. */
    connect(): Promise<void> | import('rxjs').Observable<void> {
        this._connected = true;
        return Promise.resolve();
    }

    /** Create a NATS request from a pattern and options. */
    createRequest(pattern: Pattern, options: RequestInitOpts<any, any>): NatsRequest<any> {
        const topic = typeof pattern === 'string' ? pattern : String(pattern);
        // The NatsRequest constructor signature matches BaseTopicRequest(topic, pattern, initOpts)
        return new NatsRequest<any>(topic, pattern as any, options as any);
    }

    /** Initialize request context with transport-specific data. */
    initContext(context: RequestContext, request: NatsRequest<any>): void {
        (request as any).initialized = true;
        (context as any).NatsTransportStrategy = this;
    }

    /** Clean up/close transport. */
    onShutdown(): Promise<void> {
        this._connected = false;
        return Promise.resolve();
    }

    /** Return the transport configuration. */
    getConfig(): NatsClientConfig {
        return {} as any;
    }

    /** Whether the transport is currently connected. */
    isConnected(): boolean {
        return this._connected;
    }
}

/** Alias token for DI compatibility (same as HTTP transport). */
export const NatsTransportStrategyToken = CLIENT_TRANSPORT_STRATEGY;
