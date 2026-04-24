import { Injectable } from '@tsdi/ioc';
import { ITimeoutStrategy, DEFAULT_TIMEOUT } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

@Injectable()
export class MqttTimeoutStrategy implements ITimeoutStrategy {
    private _timeout = DEFAULT_TIMEOUT;

    getTimeout(): number {
        return this._timeout;
    }

    handleTimeout(error: Error, context: RequestContext): Error {
        return new Error(`MQTT request timeout after ${this._timeout}ms: ${error.message}`);
    }

    shouldApplyTimeout(context: RequestContext): boolean {
        return true;
    }

    createTimeoutError(timeout: number): Error {
        return new Error(`MQTT timeout: ${timeout}ms`);
    }
}

export const MqttTimeoutStrategyToken = 'TIMEOUT_STRATEGY';