import { Injectable } from '@tsdi/ioc';
import { ITimeoutStrategy, DEFAULT_TIMEOUT } from '@tsdi/client';
import { RequestContext } from '@tsdi/common';

@Injectable()
export class HttpTimeoutStrategy implements ITimeoutStrategy {
    getTimeout(): number {
        return DEFAULT_TIMEOUT;
    }

    handleTimeout(error: Error, _context: RequestContext): Error {
        return error;
    }

    shouldApplyTimeout(_context: RequestContext): boolean {
        return true;
    }

    createTimeoutError(timeout: number): Error {
        return new Error(`Timeout after ${timeout}ms`);
    }
}
