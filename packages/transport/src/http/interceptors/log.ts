import { Endpoint, Interceptor } from '@tsdi/core';
import { Injectable, isNumber } from '@tsdi/ioc';
import { Logger, LoggerManager } from '@tsdi/logs';
import * as chalk from 'chalk';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpContext, HttpServRequest, HttpServResponse } from '../context';
import { emptyStatus, redirectStatus } from '../status';



@Injectable()
export class LogInterceptor implements Interceptor<HttpServRequest, HttpServResponse> {

    constructor() { }

    intercept(req: HttpServRequest, next: Endpoint<HttpServRequest, HttpServResponse>, ctx: HttpContext): Observable<HttpServResponse> {
        const logger: Logger = ctx.target?.logger ?? ctx.getValue(Logger) ?? ctx.get(LoggerManager).getLogger();

        const start = Date.now();
        const method = chalk.cyan(ctx.method);
        logger.info(incoming, method, ctx.url);
        return next.handle(req, ctx)
            .pipe(
                map(res => {
                    logger.info(outgoing, method, ctx.url, this.getStatus(ctx.status), this.getTimespan(Date.now() - start), this.getSize(ctx.length), this.getMessage(ctx.status, ctx.statusMessage));
                    return res;
                })
            );
    }

    private getStatus(status: number) {
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
        } else if (status > 300) {
            return chalk.yellow(status);
        } else if (status > 200) {
            return chalk.cyan(status);
        }

    }

    private getMessage(status: number, msg: string) {
        if (!msg) return '';
        if (status >= 500) {
            return chalk.red(msg);
        } else if (status > 300) {
            return chalk.yellow(msg);
        } else if (status > 200) {
            return chalk.cyan(msg);
        }
    }

    private getTimespan(times: number) {
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

    getSize(size?: number) {
        if (!isNumber(size)) return '';
        if (size >= 1073741824) {
            return chalk.gray(`${parseFloat((size / 1073741824).toFixed(2))}gb`);
        } else if (size >= 1048576) {
            return chalk.gray(`${parseFloat((size / 1048576).toFixed(2))}mb`);
        } else if (size >= 1024) {
            return chalk.gray(`${parseFloat((size / 1024).toFixed(2))}kb`);
        } else {
            return chalk.gray(`${size}b`);
        }
    }

}

const incoming = chalk.gray('--->');
const outgoing = chalk.gray('<---');
const minS = 1000;
const minM = 60000;
