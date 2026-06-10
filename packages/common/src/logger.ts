import { Abstract, Exception, Inject, InjectFlags, Injectable, Nullable, isNumber } from '@tsdi/ioc';
import { Filter, BytesFormatPipe, HrtimeFormatter } from '@tsdi/core';
import { Level, InjectLog, Logger, matchLevel, ConsoleLog } from '@tsdi/logger';
import { Observable, catchError, map, throwError } from 'rxjs';
import { RequestInterceptor } from './interceptor';
import { ReadableLike, WritableLike } from './stream';
import { Incoming, TopicIncoming, UrlIncoming } from './incoming';
import { Outgoing } from './outgoing';
import { CONTENT_LENGTH, RequestContext } from './context';
import { StatusMessageAdapter } from './MessageAdapter';
import { RequestHandler } from './handler';


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

    abstract format(withColor: boolean, path: string, method?: string, hrtime?: [number, number], statusCode?: string | number | null, statusMessage?: string, contentLength?: number | null, error?: Exception): string[];

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
export class LoggerInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, Filter<Incoming, Observable<Outgoing>, RequestContext> {

    private options: LoggerOptions;

    @InjectLog()
    private logger!: Logger;

    constructor(private formatter: ResponseStatusFormater, @Nullable() options: LoggerOptions) {
        this.options = { ...defopts, ...options } as LoggerOptions;
    }

    doFilter(req: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>> {
        return this.intercept(req, next, context);
    }

    intercept(req: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>> {
        const logger = context.getInjector().get(Logger, this.logger, InjectFlags.Self);
        const level = this.options.level;
        if (!matchLevel(logger.level, level)) {
            return next.handle(req, context);
        }
        //todo console log and other. need to refactor formater.
        const withColor = logger instanceof ConsoleLog;
        const start = this.formatter.htime.hrtime();
        const path = (req as UrlIncoming)?.url ?? (req as TopicIncoming)?.topic ?? req.pattern;
        logger[level](...this.formatter.format(withColor, path, req.method));
        return next.handle(req, context)
            .pipe(
                map(res => {
                    const adapter = context.get(StatusMessageAdapter, null as any);
                    const output = res as any;
                    const status = adapter?.status ?? output?.statusCode ?? output?.status;
                    const statusMessage = adapter?.getStatusMessage?.() ?? output?.statusMessage;
                    const error = adapter?.error ?? output?.error;
                    logger[level](...this.formatter.format(withColor, path, req.method,
                        this.formatter.htime.hrtime(start), status, statusMessage, context.get(CONTENT_LENGTH), error));
                    return res
                }),
                catchError(err => {
                    logger[level](...this.formatter.format(withColor, path, req.method,
                        this.formatter.htime.hrtime(start), err.statusCode, err.statusMessage, context.get(CONTENT_LENGTH), err));
                    return throwError(() => err);
                })
            )
    }


}



const clrZReg = /\.?0+$/;

