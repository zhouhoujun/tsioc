import { HttpStatusCode, Middleware, TransportContext } from '@tsdi/core';
import { Injectable, isNumber } from '@tsdi/ioc';
import { Logger, LoggerManager } from '@tsdi/logs';
import { ev } from '../consts';
import { HttpError } from '../http';
import { statusMessage } from '../http/status';

@Injectable()
export class LogMiddleware implements Middleware {

    constructor() { }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const logger: Logger = ctx.target?.logger ?? ctx.getValue(Logger) ?? ctx.get(LoggerManager).getLogger();

        logger.info('--------------->', ctx.url);
        try {
            await next();
            logger.info('<---------------', ctx.url, ctx.status);
        } catch (er) {
            let err = er as HttpError;
            let statusCode = (err.status || err.statusCode) as HttpStatusCode;

            // ENOENT support
            if (ev.ENOENT === err.code) statusCode = 404;

            // default to 500
            if (!isNumber(statusCode) || !statusMessage[statusCode]) statusCode = 500;
            logger.error('--------------->', ctx.url, statusCode, err);
            throw err;
        }
    }

}