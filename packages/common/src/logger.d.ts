import { Exception } from '@tsdi/ioc';
import { Filter, BytesFormatPipe, HrtimeFormatter } from '@tsdi/core';
import { Level } from '@tsdi/logger';
import { Observable } from 'rxjs';
import { StatusAdapter } from './StatusAdapter';
import { RequestInterceptor } from './interceptor';
import { ReadableLike, WritableLike } from './stream';
import { Incoming } from './incoming';
import { Outgoing } from './outgoing';
import { RequestContext } from './context';
import { RequestHandler } from './handler';
/**
 * status formater.
 */
export declare abstract class ResponseStatusFormater {
    protected bytes: BytesFormatPipe;
    readonly htime: HrtimeFormatter;
    abstract get incoming(): string;
    abstract get outgoing(): string;
    constructor();
    abstract format(adapter: StatusAdapter, withColor: boolean, path: string, method?: string, hrtime?: [number, number], statusCode?: string | number | null, statusMessage?: string, contentLength?: number | null, error?: Exception): string[];
    protected formatSize(size?: number | null, precise?: number): string;
    protected cleanZero(num: string): string;
}
export declare abstract class LoggerOptions {
    abstract get level(): Level;
}
/**
 * Logger interceptor, filter.
 */
export declare class LoggerInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, Filter<Incoming, Observable<Outgoing>, RequestContext> {
    private formatter;
    private options;
    private logger;
    constructor(formatter: ResponseStatusFormater, options: LoggerOptions);
    doFilter(req: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>>;
    intercept(req: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<WritableLike<Outgoing>>;
}
