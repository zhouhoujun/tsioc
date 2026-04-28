import { Inject, Injectable, isDefined, Optional, token } from '@tsdi/ioc';
import { Interceptor, Handler } from '@tsdi/core';
import {
    FileAdapter, FileStats, FindOptions, GET, HEAD, HeaderAdapter, Incoming, IStats, NotFoundException,
    Outgoing, ReadableLike, RequestContext, StatusAdapter, TopicIncoming, UrlIncoming
} from '@tsdi/common';
import { Observable, from, mergeMap, throwError } from 'rxjs';



export const CONTENT_OPTIONS = token<ContentOptions>('CONTENT_OPTIONS');
/**
 * static content resources.
 */
@Injectable()
export class ContentInterceptor implements Interceptor<ReadableLike<Incoming>> {

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
        const statusAdapter = context.get(StatusAdapter);
        if (options.defer) {
            return next.handle(input, context)
                .pipe(
                    mergeMap(async (res: Outgoing) => {
                        const file = await this.find(path, res, statusAdapter, fileAdapter, options)
                        if (!file) {
                            return throwError(() => new NotFoundException())
                        }
                        return file;
                    })
                )
        } else {
            return from(this.find(path, context.getResponse(), statusAdapter, fileAdapter, options))
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
        const headerAdapter = context.get(HeaderAdapter);
        const fileAdapter = context.get(FileAdapter);
        headerAdapter.setContentLength(res, file.stats.size);
        if (!headerAdapter.getLastModified(res)) {
            headerAdapter.setLastModified(res, file.stats.mtime.toUTCString())
        }

        if (!headerAdapter.getCacheControl(res)) {
            const maxAge = this.options.maxAge ?? 0;
            const directives = [`max-age=${(maxAge / 1000 | 0)}`];
            if (this.options.immutable) {
                directives.push('immutable')
            }
            headerAdapter.setCacheControl(res, directives.join(','))
        }
        if (!headerAdapter.hasContentType(res)) {
            headerAdapter.setContentType(res, fileAdapter.extname(file.filename, file.encodingExt))
        }

        res.body = fileAdapter.read(file.filename);
        return res;

    }

    protected find(path: string, res: Outgoing, statusAdapter: StatusAdapter, fileAdapter: FileAdapter, options: ContentOptions) {
        if (statusAdapter && (isDefined(res.statusCode) && !statusAdapter.isNotFound(res.statusCode))) return Promise.resolve(null);
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


// /**
//  * Content send adapter.
//  */
// @Abstract()
// export abstract class ContentSendAdapter {
//     /**
//      * send file by request context
//      * @param ctx RequestContext
//      * @param path file path
//      * @param options send options
//      */
//     abstract send(ctx: AbstractRequestContext, path: string, options: SendOptions): Promise<string>;
// }



export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    format: true,
    defer: false,
    immutable: false,

}

