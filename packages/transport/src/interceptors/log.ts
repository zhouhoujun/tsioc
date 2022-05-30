import { BytesPipe, Endpoint, Interceptor, ServerContext, TimesPipe, TransportContext } from '@tsdi/core';
import { Abstract, Inject, Injectable, isNumber, Nullable } from '@tsdi/ioc';
import { Level, Logger, LoggerManager, matchLevel } from '@tsdi/logs';
import * as chalk from 'chalk';
import { Observable, map } from 'rxjs';
import { hrtime } from 'process';


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

    @Inject()
    protected bytes!: BytesPipe;
    @Inject()
    protected times!: TimesPipe;

    constructor() {

    }

    abstract format(ctx: TransportContext, hrtime: [number, number]): string[];

    protected formatSize(size?: number, precise = 2) {
        if (!isNumber(size)) return ''
        return chalk.gray(this.bytes.transform(size, precise))
    }

    protected formatHrtime(hrtime: [number, number], precise = 2): string {
        if (!hrtime) return '';
        const [s, ns] = hrtime;
        const total = s * 1e3 + ns / 1e6;

        return chalk.gray(this.times.transform(total, precise))
    }

    protected cleanZero(num: string) {
        return num.replace(clrZReg, '');
    }
}

const clrZReg = /\.?0+$/;
const incoming = chalk.gray('--->');
const outgoing = chalk.gray('<---');
