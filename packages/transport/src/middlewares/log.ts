import { HttpStatusCode, Middleware, TransportContext } from '@tsdi/core';
import { Injectable, isNumber } from '@tsdi/ioc';
import { Logger, LoggerManager } from '@tsdi/logs';
import * as chalk from 'chalk';
import { ev } from '../consts';
import { emptyStatus, redirectStatus, statusMessage } from '../http/status';



@Injectable()
export class LogMiddleware implements Middleware {

    constructor() { }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        const logger: Logger = ctx.target?.logger ?? ctx.getValue(Logger) ?? ctx.get(LoggerManager).getLogger();

        const start = Date.now();
        const method = chalk.cyan(ctx.method);
        logger.info(incoming, method, ctx.url);
        try {
            await next();
            logger.info(outgoing, method, ctx.url, this.getStatusWithColor(ctx.status), this.getTimespan(Date.now() - start));
        } catch (er) {
            let err = er as any;
            let statusCode = (err.status || err.statusCode) as HttpStatusCode;

            // ENOENT support
            if (ev.ENOENT === err.code) statusCode = 404;

            // default to 500
            if (!isNumber(statusCode) || !statusMessage[statusCode]) statusCode = 500;
            logger.error(outgoing, method, ctx.url, this.getStatusWithColor(statusCode), this.getTimespan(Date.now() - start), err);
            throw err;
        }

    }

    getStatusWithColor(status: number) {
        if (emptyStatus[status]) {
            return chalk.yellow(status);
        }
        if (redirectStatus[status]) {
            return chalk.blue(status);
        }
        if (status == 200) {
            return chalk.green(status);
        }
        if (status >= 500) {
            return chalk.red(status);
        }

    }

    getTimespan(times: number) {
        let unitTime: string;
        if (times >= minM) {
            unitTime = (times / minM).toFixed(2) + 'mins';
        } else if (times >= minS) {
            unitTime = (times / minM).toFixed(2) + 's';
        } else {
            unitTime = times + 'ms';
        }
        return chalk.gray(unitTime);
    }

}

const incoming = chalk.gray('--------------->');
const outgoing = chalk.gray('<---------------');
const minS = 1000;
const minM = 60000;
