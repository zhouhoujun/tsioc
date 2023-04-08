import { Abstract, Inject, Injectable, isNumber, Nullable } from '@tsdi/ioc';
import { BytesFormatPipe, EndpointContext, Interceptor, TimeFormatPipe, Handler, TransportContext } from '@tsdi/core';
import { Level, Logger, matchLevel } from '@tsdi/logs';
import * as chalk from 'chalk';
import { Observable, map } from 'rxjs';
import { hrtime } from 'process';



/**
 * status formater.
 */
@Abstract()
export abstract class ResponseStatusFormater {

    @Inject()
    protected bytes!: BytesFormatPipe;
    @Inject()
    protected times!: TimeFormatPipe;

    constructor() {

    }

    abstract format(ctx: EndpointContext, hrtime: [number, number]): string[];

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

@Abstract()
export abstract class LogInterceptorOptions {
    abstract get level(): Level;
}

const defopts = {
    level: 'debug'
} as LogInterceptorOptions;

/**
 * Log interceptor.
 */
@Injectable()
export class LogInterceptor implements Interceptor {

    private options: LogInterceptorOptions;
    constructor(@Nullable() options: LogInterceptorOptions, private formatter: ResponseStatusFormater) {
        this.options = { ...defopts, ...options } as LogInterceptorOptions;
    }

    intercept(ctx: TransportContext, next: Handler): Observable<any> {
        const logger = ctx.get(Logger);

        const level = this.options.level;
        if (!matchLevel(logger.level, level)) {
            return next.handle(ctx);
        }

        //todo console log and other. need to refactor formater.
        const start = hrtime();
        const method = chalk.cyan(ctx.method);
        const url = ctx.url;
        logger[level](incoming, method, url);
        return next.handle(ctx)
            .pipe(
                map(res => {
                    logger[level](outgoing, method, url, ...this.formatter.format(ctx, hrtime(start)));
                    return res
                })
            )
    }

}


const clrZReg = /\.?0+$/;
const incoming = chalk.gray('--->');
const outgoing = chalk.gray('<---');
