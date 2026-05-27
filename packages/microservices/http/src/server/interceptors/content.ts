import { Inject, Injectable, Optional, token } from '@tsdi/ioc';
import { Interceptor, Handler } from '@tsdi/core';
import {
    FileAdapter, FileStats, FindOptions, GET, HEAD, Incoming, IStats, NotFoundException,
    Outgoing, ReadableLike, RequestContext, TopicIncoming, UrlIncoming
} from '@tsdi/common';
import { Observable, from, mergeMap, throwError } from 'rxjs';



export const CONTENT_OPTIONS = token<ContentOptions>('CONTENT_OPTIONS');
/**
 * static content resources.
 */
@Injectable()
export class HttpContentInterceptor implements Interceptor<ReadableLike<Incoming>> {

    private options: ContentOptions;

    constructor(@Optional() @Inject(CONTENT_OPTIONS) options: ContentOptions) {
        this.options = { ...defOpts, ...options };
    }


    intercept(input: ReadableLike<Incoming>, next: Handler<ReadableLike<Incoming>, any>, context: RequestContext): Observable<any> {
        const path = (input as UrlIncoming).url || (input as TopicIncoming).topic || input.pattern;
        if (!path || !(!input.method || input.method === HEAD || input.method === GET || input.method === '*')) {
            return next.handle(input, context);
        }

        const options = this.options;
        const fileAdapter = context.get(FileAdapter);
        if (options.defer) {
            return next.handle(input, context)
                .pipe(
                    mergeMap(async (res: Outgoing) => {
                        const file = await this.find(path, res, fileAdapter, options)
                        if (!file) {
                            return throwError(() => new NotFoundException())
                        }
                        return file;
                    })
                )
        } else {
            return from(this.find(path, context.getResponse(), fileAdapter, options))
                .pipe(
                    mergeMap(file => {
                        if (!file || !file.filename) return next.handle(input, context)
                        return this.send(context, file);
                    })
                )
        }
    }

    protected async send(context: RequestContext, file: FileStats<IStats>) {
        const res = context.getResponse();
        if (this.options.setHeaders) {
            this.options.setHeaders(res, file.filename, file.stats);
        }
        const fileAdapter = context.get(FileAdapter);
        res.setHeader('content-length', file.stats.size);
        if (!res.hasHeader('last-modified')) {
            res.setHeader('last-modified', file.stats.mtime.toUTCString())
        }

        if (!res.hasHeader('cache-control')) {
            const maxAge = this.options.maxAge ?? 0;
            const directives = [`max-age=${(maxAge / 1000 | 0)}`];
            if (this.options.immutable) {
                directives.push('immutable')
            }
            res.setHeader('cache-control', directives.join(','))
        }
        if (!res.hasHeader('content-type')) {
            res.setHeader('content-type', fileAdapter.extname(file.filename, file.encodingExt))
        }

        res.body = fileAdapter.read(file.filename);
        return res;

    }

    protected find(path: string, res: Outgoing, fileAdapter: FileAdapter, options: ContentOptions) {
        if (res.statusCode && !(res.error instanceof NotFoundException)) return Promise.resolve(null);
        return fileAdapter.find(path, options);
    }


}

/**
 * Static Content options.
 */

export interface ContentOptions<TStats = any> extends FindOptions {
    setHeaders?: (outgoing: Outgoing, path: string, stats: TStats) => void;
    defer?: boolean;
}


export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    format: true,
    defer: false,
    immutable: false,

}
