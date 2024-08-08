import { Abstract, Inject, InjectFlags, Injectable, Nullable, isNumber } from '@tsdi/ioc';
import { Interceptor, Handler, Filter, BytesFormatPipe, TimeFormatPipe, HrtimeFormatter } from '@tsdi/core';
import { Level, InjectLog, Logger, matchLevel } from '@tsdi/logger';
import { Observable, map } from 'rxjs';
import { RequestContext } from '../RequestContext';


/**
 * status formater.
 */
@Abstract()
export abstract class ResponseStatusFormater {

    @Inject()
    protected bytes!: BytesFormatPipe;
    @Inject()
    readonly htime!: HrtimeFormatter;

    abstract get incoming(): string;
    abstract get outgoing(): string;

    constructor() {

    }

    abstract format(logger: Logger, ctx: RequestContext, hrtime?: [number, number]): string[];

    protected formatSize(size?: number | null, precise = 2) {
        if (!isNumber(size)) return ''
        return this.bytes.transform(size, precise)
    }


    protected cleanZero(num: string) {
        return num.replace(clrZReg, '');
    }
}

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
        const start = this.formatter.htime.hrtime();
        logger[level](...this.formatter.format(logger, ctx));
        return next.handle(ctx)
            .pipe(
                map(res => {
                    logger[level](...this.formatter.format(logger, ctx, this.formatter.htime.hrtime(start)));
                    return res
                })
            )
    }

}



const clrZReg = /\.?0+$/;

