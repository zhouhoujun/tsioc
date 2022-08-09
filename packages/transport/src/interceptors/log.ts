import { BytesPipe, Endpoint, EndpointContext, Interceptor, RequestPacket, TimesPipe, ConnectionContext } from '@tsdi/core';
import { Abstract, Inject, Injectable, isNumber, Nullable } from '@tsdi/ioc';
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
    protected bytes!: BytesPipe;
    @Inject()
    protected times!: TimesPipe;

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

    intercept(req: RequestPacket, next: Endpoint, ctx: EndpointContext): Observable<any> {
        const logger: Logger = ctx.target.logger ?? ctx.get(Logger);

        const level = this.options.level;
        if (!matchLevel(logger.level, level)) {
            return next.handle(req, ctx);
        }

        //todo console log and other. need to refactor formater.
        const start = hrtime();
        const method = chalk.cyan((ctx as ConnectionContext).method ?? req.method);
        const url = (ctx as ConnectionContext).url ?? req.url;
        logger[level]( incoming, method, url);
        return next.handle(req, ctx)
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
