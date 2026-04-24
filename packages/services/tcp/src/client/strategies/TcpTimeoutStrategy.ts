import { Injectable } from '@tsdi/ioc';
import { ITimeoutStrategy, DEFAULT_TIMEOUT } from '@tsdi/common/client';
import { RequestContext } from '@tsdi/common';

/**
 * Tcp timeout strategy.
 * TCP 请求超时策略的最小实现。
 *
 * English: Minimal implementation of a timeout strategy for TCP client operations.
 */
@Injectable()
export class TcpTimeoutStrategy implements ITimeoutStrategy {
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
