import { Injectable } from '@tsdi/ioc';
import { ITimeoutStrategy, TIMEOUT_STRATEGY, DEFAULT_TIMEOUT } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

/**
 * CoAP Timeout Strategy
 * Uses a default timeout and converts timeout events into TimeoutError compatible objects.
 */
@Injectable()
export class CoapTimeoutStrategy implements ITimeoutStrategy {
    getTimeout(): number {
        return DEFAULT_TIMEOUT ?? 15000;
    }

    handleTimeout(error: Error, context: RequestContext): Error {
        const e = new Error(`CoAP request timed out after ${this.getTimeout()}ms`);
        (e as any).name = 'TimeoutError';
        return e;
    }

    shouldApplyTimeout(_context: RequestContext): boolean {
        return true;
    }

    createTimeoutError(timeout: number): Error {
        const e = new Error(`Timeout after ${timeout}ms`);
        (e as any).name = 'TimeoutError';
        return e;
    }
}
