import { Interceptor, Handler } from '@tsdi/core';
import { FileAdapter, FileStats, FindOptions, Incoming, IStats, Outgoing, ReadableLike, RequestContext, StatusAdapter } from '@tsdi/common';
import { Observable } from 'rxjs';
export declare const CONTENT_OPTIONS: import("@tsdi/ioc").InjectToken<ContentOptions<any>>;
/**
 * static content resources.
 */
export declare class ContentInterceptor implements Interceptor<ReadableLike<Incoming>> {
    private options;
    constructor(options: ContentOptions);
    intercept(input: ReadableLike<Incoming>, next: Handler<ReadableLike<Incoming>, any>, context: RequestContext): Observable<any>;
    protected send(context: RequestContext, file: FileStats<IStats>): Promise<Outgoing<any, any>>;
    protected find(path: string, res: Outgoing, statusAdapter: StatusAdapter, fileAdapter: FileAdapter, options: ContentOptions): Promise<FileStats<IStats<number>> | null>;
}
/**
 * Static Content options.
 */
export interface ContentOptions<TStats = any> extends FindOptions {
    setHeaders?: (outgoing: Outgoing, path: string, stats: TStats) => void;
    defer?: boolean;
}
export declare const defOpts: ContentOptions;
