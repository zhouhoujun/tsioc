import { Endpoint, Interceptor, ServerContext, TransportContext } from '@tsdi/core';
import { Abstract, Injectable, isNumber, Nullable } from '@tsdi/ioc';
import { Level, Logger, LoggerManager, matchLevel } from '@tsdi/logs';
import * as chalk from 'chalk';
import { Observable, map } from 'rxjs';
import { hrtime } from 'node:process';


@Abstract()
export abstract class LogInterceptorOptions {
    abstract get level(): Level;
}

const defopts = {
    level: 'debug'
} as LogInterceptorOptions;

@Injectable()
export class LogInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    private options: LogInterceptorOptions;
    constructor(@Nullable() options: LogInterceptorOptions) {
        this.options = { ...defopts, ...options } as LogInterceptorOptions;
    }

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, ctx: ServerContext): Observable<TResponse> {
        const logger: Logger = ctx.target.logger ?? ctx.get(Logger) ?? ctx.get(LoggerManager).getLogger();

        const level = this.options.level;
        if (!matchLevel(logger.level, level)) {
            return next.handle(req, ctx);
        }

        //todo console log and other. need to refactor formater.
        const start = hrtime();
        const method = chalk.cyan(ctx.method);
        logger[level].call(logger, incoming, method, ctx.url);
        return next.handle(req, ctx)
            .pipe(
                map(res => {
                    logger[level].call(logger, outgoing, method, ctx.url, ...ctx.resolve(ResponseStatusFormater).format(ctx, hrtime(start)));
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
    abstract format(ctx: TransportContext, hrtime: [number, number]): string[];

    protected formatSize(size?: number, precise = 2) {
        if (!isNumber(size)) return ''
        let unit = '';
        for (let i = 0; i < bits.length; i++) {
            if (size >= bits[i]) {
                unit = this.cleanZero((size / bits[i]).toFixed(precise)) + bitUnits[i];
                break;
            }
        }
        return chalk.gray(unit)
    }

    protected formatHrtime(hrtime: [number, number], precise = 2): string {
        if (!hrtime) return '';
        const [s, ns] = hrtime;
        const total = s + ns / 1e9;

        let unitTime = '';
        for (let i = 0; i < unitSize.length; i++) {
            if (total >= unitSize[i]) {
                unitTime = this.cleanZero((total / unitSize[i]).toFixed(precise)) + minimalDesc[i];
                break;
            }
        }
        return chalk.gray(unitTime)
    }

    protected cleanZero(num: string) {
        return num.replace(clrZReg, '');
    }
}

const clrZReg = /\.?0+$/;

const minimalDesc = ['h', 'min', 's', 'ms', 'μs', 'ns'];
const unitSize = [60 * 60, 60, 1, 1e-3, 1e-6, 1e-9];

const bits = [1024 * 1024 * 1024 * 1024, 1024 * 1024 * 1024, 1024 * 1024, 1024, 1];
const bitUnits = ['tb', 'gb', 'mb', 'kb', 'b'];
const incoming = chalk.gray('--->');
const outgoing = chalk.gray('<---');
