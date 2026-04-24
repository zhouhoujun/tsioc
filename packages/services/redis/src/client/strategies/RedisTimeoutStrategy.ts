import { Injectable } from '@tsdi/ioc';
import { ITimeoutStrategy, DEFAULT_TIMEOUT } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

/**
 * Redis timeout strategy.
 * Simple default timeout handling for Redis requests.
 */
@Injectable()
export class RedisTimeoutStrategy implements ITimeoutStrategy {
    private _timeout = DEFAULT_TIMEOUT;

    getTimeout(): number {
        return this._timeout;
    }

    handleTimeout(_error: Error, _context: RequestContext): Error {
        // Wrap or return as-is; callers can inspect the error message
        return _error;
    }

    shouldApplyTimeout(_context: RequestContext): boolean {
        return true;
    }

    createTimeoutError(timeout: number): Error {
        return new Error(`Redis request timed out after ${timeout}ms`);
    }
}

export const RedisTimeoutStrategyToken = 'TIMEOUT_STRATEGY';
