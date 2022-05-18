import { Endpoint, Interceptor, TransportContext } from '@tsdi/core';
import { Abstract, Injectable, isNumber } from '@tsdi/ioc';
import { Logger, LoggerManager } from '@tsdi/logs';
import * as chalk from 'chalk';
import { Observable, map } from 'rxjs';



@Injectable()
export class LogInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    constructor() { }

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, ctx: TransportContext): Observable<TResponse> {
        const logger: Logger = ctx.target?.logger ?? ctx.getValue(Logger) ?? ctx.get(LoggerManager).getLogger();

        const start = Date.now();
        const method = chalk.cyan(ctx.method);
        logger.info(incoming, method, ctx.url);
        return next.handle(req, ctx)
            .pipe(
                map(res => {
                    logger.info(outgoing, method, ctx.url, ...ctx.resolve(ResponseStatusFormater).format(ctx, Date.now() - start));
                    return res
                })
            )
    }

}

/**
 * status formater.
 */
@Abstract()
export abstract class ResponseStatusFormater {
    abstract format(ctx: TransportContext, usetimes: number): string[];

    protected formatSize(size?: number) {
        if (!isNumber(size)) return ''
        if (size >= 1073741824) {
            return chalk.gray(`${parseFloat((size / 1073741824).toFixed(2))}gb`)
        } else if (size >= 1048576) {
            return chalk.gray(`${parseFloat((size / 1048576).toFixed(2))}mb`)
        } else if (size >= 1024) {
            return chalk.gray(`${parseFloat((size / 1024).toFixed(2))}kb`)
        } else {
            return chalk.gray(`${size}b`)
        }
    }

    protected formatTimespan(times: number) {
        let unitTime: string;
        if (times >= minM) {
            unitTime = (times / minM).toFixed(2) + 'mins'
        } else if (times >= minS) {
            unitTime = (times / minM).toFixed(2) + 's'
        } else {
            unitTime = times + 'ms'
        }
        return chalk.gray(unitTime)
    }
}

const incoming = chalk.gray('--->');
const outgoing = chalk.gray('<---');
const minS = 1000;
const minM = 60000;
