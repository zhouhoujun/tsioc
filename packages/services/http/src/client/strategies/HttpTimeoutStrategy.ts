import { Injectable } from '@tsdi/ioc';
import { ITimeoutStrategy, DEFAULT_TIMEOUT } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

/**
 * HTTP timeout strategy.
 * HTTP 请求超时策略的最小实现。
 */
@Injectable()
export class HttpTimeoutStrategy implements ITimeoutStrategy {
    getTimeout(): number {
        return DEFAULT_TIMEOUT;
    }

    handleTimeout(error: Error, context: RequestContext): Error {
        return error;
    }

    shouldApplyTimeout(context: RequestContext): boolean {
        return true;
    }

    createTimeoutError(timeout: number): Error {
        return new Error(`Timeout after ${timeout}ms`);
    }
}
