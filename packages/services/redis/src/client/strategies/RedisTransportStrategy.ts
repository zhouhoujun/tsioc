import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY, RequestInitOpts } from '@tsdi/common/client';
import { Pattern, TopicRequestOptions } from '@tsdi/common';
import { RedisRequest } from '../request';
import { RedisClientConfig } from '../options';
import { Context } from '@tsdi/ioc';
import { Observable } from 'rxjs';

/**
 * Redis client transport strategy.
 * A lightweight HTTP-like transport adapted for Redis pub/sub patterns.
 */
@Injectable()
export class RedisTransportStrategy
    implements IClientTransportStrategy<RedisRequest<any>, any, RedisClientConfig> {

    private _connected = false;

    // Connect to the transport. Redis sockets are managed by RedisClient,
    // but we expose a minimal connect contract for DI compatibility.
    connect(): Promise<void> | Observable<void> {
        this._connected = true;
        return Promise.resolve();
    }

    // Create a RedisRequest using the topic as the transport channel name.
    createRequest(pattern: Pattern, options: RequestInitOpts<any, TopicRequestOptions>): RedisRequest<any> {
        const topic = typeof pattern === 'string' ? pattern : String(pattern);
        return new RedisRequest<any>(topic, pattern as any, options as any);
    }

    // Initialize request context with transport data for potential subscriber linkage.
    initContext(context: Context, request: RedisRequest<any>): void {
        (context as any).RedisTransport = this;
    }

    onShutdown(): Promise<void> {
        this._connected = false;
        return Promise.resolve();
    }

    getConfig(): RedisClientConfig {
        return {} as RedisClientConfig;
    }

    isConnected(): boolean {
        return this._connected;
    }
}

export const RedisTransportStrategyToken = CLIENT_TRANSPORT_STRATEGY;
