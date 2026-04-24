import { Injectable } from '@tsdi/ioc';
import { ITimeoutStrategy, DEFAULT_TIMEOUT } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

@Injectable()
export class AmqpTimeoutStrategy implements ITimeoutStrategy {
    private _timeout = DEFAULT_TIMEOUT;

    getTimeout(): number {
        return this._timeout;
    }

    handleTimeout(error: Error, context: RequestContext): Error {
        return new Error(`AMQP request timeout after ${this._timeout}ms: ${error.message}`);
    }

    shouldApplyTimeout(context: RequestContext): boolean {
        return true;
    }

    createTimeoutError(timeout: number): Error {
        return new Error(`AMQP timeout: ${timeout}ms`);
    }
}

export const AmqpTimeoutStrategyToken = 'TIMEOUT_STRATEGY';