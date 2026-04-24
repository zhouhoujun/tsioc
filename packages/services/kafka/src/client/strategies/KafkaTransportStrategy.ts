import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY } from '@tsdi/common/client';
import { Pattern, RequestInitOpts } from '@tsdi/common';

@Injectable()
export class KafkaTransportStrategy implements IClientTransportStrategy<any, any, any> {
    private _connected = false;

    connect(): Promise<void> {
        this._connected = true;
        return Promise.resolve();
    }

    createRequest(pattern: Pattern, options: RequestInitOpts<any, any>): any {
        const topic = typeof pattern === 'string' ? pattern : 'default-topic';
        return { topic, payload: options.payload, headers: options.headers };
    }

    initContext(context: any, request: any): void {
        context.kafkaTopic = request.topic;
    }

    onShutdown(): Promise<void> {
        this._connected = false;
        return Promise.resolve();
    }

    getConfig(): any {
        return {};
    }

    isConnected(): boolean {
        return this._connected;
    }
}

export const KafkaTransportStrategyToken = CLIENT_TRANSPORT_STRATEGY;