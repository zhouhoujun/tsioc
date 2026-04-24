import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY } from '@tsdi/common/client';
import { Pattern, RequestInitOpts } from '@tsdi/common';

@Injectable()
export class AmqpTransportStrategy implements IClientTransportStrategy<any, any, any> {
    private _connected = false;

    connect(): Promise<void> {
        this._connected = true;
        return Promise.resolve();
    }

    createRequest(pattern: Pattern, options: RequestInitOpts<any, any>): any {
        const queue = typeof pattern === 'string' ? pattern : 'default-queue';
        return { queue, payload: options.payload, headers: options.headers };
    }

    initContext(context: any, request: any): void {
        context.amqpQueue = request.queue;
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

export const AmqpTransportStrategyToken = CLIENT_TRANSPORT_STRATEGY;