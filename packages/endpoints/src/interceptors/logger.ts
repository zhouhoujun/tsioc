import { Abstract, Inject, InjectFlags, Injectable, Nullable, isNumber } from '@tsdi/ioc';
import { Incoming, Outgoing, RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Filter, BytesFormatPipe, HrtimeFormatter } from '@tsdi/core';
import { Level, InjectLog, Logger, matchLevel } from '@tsdi/logger';
import { Observable, map } from 'rxjs';
import { AbstractRequestContext } from '../AbstractRequestContext';


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

    abstract format(logger: Logger, ctx: AbstractRequestContext, hrtime?: [number, number]): string[];

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
export class LoggerInterceptor implements RequestInterceptor<Incoming, Outgoing, AbstractRequestContext>, Filter<Incoming, Outgoing, AbstractRequestContext> {

    private options: LoggerOptions;

    @InjectLog()
    private logger!: Logger;

    constructor(private formatter: ResponseStatusFormater, @Nullable() options: LoggerOptions) {
        this.options = { ...defopts, ...options } as LoggerOptions;
    }

    doFilter(req: Incoming, next: RequestHandler, context: AbstractRequestContext): Observable<Outgoing> {
        return this.intercept(req, next, context);
    }

    intercept(req: Incoming, next: RequestHandler, context: AbstractRequestContext): Observable<Outgoing> {
        const logger = context.getInjector().get(Logger, this.logger, InjectFlags.Self);

        const level = this.options.level;
        if (!matchLevel(logger.level, level)) {
            return next.handle(req, context);
        }

        //todo console log and other. need to refactor formater.
        const start = this.formatter.htime.hrtime();
        logger[level](...this.formatter.format(logger, context));
        return next.handle(req, context)
            .pipe(
                map(res => {
                    logger[level](...this.formatter.format(logger, context, this.formatter.htime.hrtime(start)));
                    return res
                })
            )
    }
    

}



const clrZReg = /\.?0+$/;

