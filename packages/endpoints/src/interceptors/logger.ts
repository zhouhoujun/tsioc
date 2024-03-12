import { Abstract, Inject, InjectFlags, Injectable, Nullable, isNumber } from '@tsdi/ioc';
import { Interceptor, Handler, Filter, BytesFormatPipe, TimeFormatPipe } from '@tsdi/core';
import { Level, InjectLog, Logger, matchLevel } from '@tsdi/logger';
import { Observable, map } from 'rxjs';
import { RequestContext } from '../RequestContext';




@Abstract()
export abstract class LoggerOptions {
    abstract get level(): Level;
}

const defopts = {
    level: 'debug'
} as LoggerOptions;

/**
 * Logger interceptor, filter.
 */
@Injectable()
export class LoggerInterceptor implements Interceptor, Filter {

    private options: LoggerOptions;

    @InjectLog()
    private logger!: Logger;

    constructor(private formatter: ResponseStatusFormater, @Nullable() options: LoggerOptions) {
        this.options = { ...defopts, ...options } as LoggerOptions;
    }

    intercept(ctx: RequestContext, next: Handler): Observable<any> {
        const logger = ctx.get(Logger, InjectFlags.Self) ?? this.logger;

        const level = this.options.level;
        if (!matchLevel(logger.level, level)) {
            return next.handle(ctx);
        }

        //todo console log and other. need to refactor formater.
        const start = this.formatter.hrtime();
        logger[level](...this.formatter.format(logger, ctx));
        return next.handle(ctx)
            .pipe(
                map(res => {
                    logger[level](...this.formatter.format(logger, ctx, this.formatter.hrtime(start)));
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
    protected bytes!: BytesFormatPipe;
    @Inject()
    protected times!: TimeFormatPipe;

    abstract get incoming(): string;
    abstract get outgoing(): string;

    constructor() {

    }

    abstract hrtime(time?: [number, number]): [number, number];

    abstract format(logger: Logger, ctx: RequestContext, hrtime?: [number, number]): string[];

    protected formatSize(size?: number, precise = 2) {
        if (!isNumber(size)) return ''
        return this.bytes.transform(size, precise)
    }

    protected formatHrtime(hrtime: [number, number], precise = 2): string {
        if (!hrtime) return '';
        const [s, ns] = hrtime;
        const total = s * 1e3 + ns / 1e6;

        return this.times.transform(total, precise)
    }

    protected cleanZero(num: string) {
        return num.replace(clrZReg, '');
    }
}

const clrZReg = /\.?0+$/;

