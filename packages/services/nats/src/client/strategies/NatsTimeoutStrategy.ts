import { Injectable } from '@tsdi/ioc';
import { ITimeoutStrategy, DEFAULT_TIMEOUT } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

/**
 * NATS timeout strategy.
 * Applies a default timeout for NATS requests and formats timeout errors.
 */
@Injectable()
export class NatsTimeoutStrategy implements ITimeoutStrategy {
    getTimeout(): number {
        return DEFAULT_TIMEOUT;
    }

    handleTimeout(error: Error, _context: RequestContext): Error {
        return this.createTimeoutError(this.getTimeout());
    }

    shouldApplyTimeout(_context: RequestContext): boolean {
        return true;
    }

    createTimeoutError(timeout: number): Error {
        return new Error(`NATS request timeout after ${timeout}ms`);
    }
}

export const NatsTimeoutStrategyToken = 'TIMEOUT_STRATEGY';
