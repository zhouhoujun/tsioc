import { Inject, Injectable, Optional, token } from '@tsdi/ioc';
import { Interceptor, Handler } from '@tsdi/core';
import {
    FileAdapter, GET, HEAD, Incoming, NotFoundException,
    Outgoing, ReadableLike, RequestContext, TopicIncoming, UrlIncoming
} from '@tsdi/common'
import { Observable, from, mergeMap, of, throwError } from 'rxjs';
import { HttpFileResult } from '../file-result';
import { HttpStaticOptions, isHttpFileResult, normalizeStaticOptions, resolveFileResult, resolveStaticFile } from '../static-file';

export interface StaticsOptions<TStats = any> extends HttpStaticOptions {
    defer?: boolean;
}

/** @deprecated use StaticsOptions */
export type ContentOptions<TStats = any> = StaticsOptions<TStats>;

export const STATICS_OPTIONS = token<StaticsOptions>('STATICS_OPTIONS');
/** @deprecated use STATICS_OPTIONS */
export const CONTENT_OPTIONS = STATICS_OPTIONS;

/**
 * static content resources.
 */
@Injectable()
export class HttpContentInterceptor implements Interceptor<ReadableLike<Incoming>> {

    private options: StaticsOptions;

    constructor(@Optional() @Inject(STATICS_OPTIONS) options: StaticsOptions) {
        this.options = { ...defOpts, ...options };
    }

    intercept(input: ReadableLike<Incoming>, next: Handler<ReadableLike<Incoming>, any>, context: RequestContext): Observable<any> {
        const path = (input as UrlIncoming).url || (input as TopicIncoming).topic || input.pattern;
        if (!path || !(!input.method || input.method === HEAD || input.method === GET || input.method === '*')) {
            return next.handle(input, context);
        }

        const options = this.options;
        const staticOptions = normalizeStaticOptions(options as HttpStaticOptions | HttpStaticOptions[] | boolean);
        if (!options.defer) {
            return from(resolveStaticFile(input, context, staticOptions))
                .pipe(
                    mergeMap(staticResponse => {
                        if (staticResponse) {
                            return of(staticResponse);
                        }
                        return next.handle(input, context)
                            .pipe(
                                mergeMap(response => from(this.mapResponse(response, input, context)))
                            );
                    })
                );
        }

        const fileAdapter = context.get(FileAdapter);
        return next.handle(input, context)
            .pipe(
                mergeMap(async (res: Outgoing) => {
                    const file = await this.find(path, res, fileAdapter, options);
                    if (!file) {
                        return throwError(() => new NotFoundException());
                    }
                    return file;
                })
            );
    }

    protected find(path: string, res: Outgoing, fileAdapter: FileAdapter, options: StaticsOptions) {
        if (res.statusCode && !(res.error instanceof NotFoundException)) {
            return Promise.resolve(null);
        }
        return fileAdapter.find(path, options);
    }

    private async mapResponse(response: any, input: ReadableLike<Incoming>, context: RequestContext): Promise<any> {
        if (isHttpFileResult(response)) {
            return resolveFileResult(response, input, context);
        }
        if (response?.body instanceof HttpFileResult) {
            const resolved = await resolveFileResult(response.body, input, context);
            const headerNames = response.getHeaderNames?.() ?? [];
            headerNames.forEach((name: string) => {
                if (!resolved.hasHeader(name)) {
                    resolved.setHeader(name, response.getHeader(name));
                }
            });
            if (response.statusCode && !resolved.statusCode) {
                resolved.statusCode = response.statusCode;
            }
            return resolved;
        }
        return response;
    }
}

export const defOpts: StaticsOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    format: true,
    defer: false,
    immutable: false,
};
