import { Abstract, Inject, Injectable, isDefined, Optional, token } from '@tsdi/ioc';
import { Interceptor, Handler } from '@tsdi/core';
import { FileAdapter, FindOptions, GET, HEAD, NotFoundException, RequestContext } from '@tsdi/common';
import { Observable, from, mergeMap, of, throwError } from 'rxjs';
import { AbstractRequestContext } from '../AbstractRequestContext';



export const CONTENT_OPTIONS = token<ContentOptions>('CONTENT_OPTIONS');
/**
 * static content resources.
 */
@Injectable()
export class ContentInterceptor implements Interceptor<AbstractRequestContext> {

    private options: ContentOptions;

    constructor(@Optional() @Inject(CONTENT_OPTIONS) options: ContentOptions) {
        this.options = { ...defOpts, ...options };
    }


    intercept(input: AbstractRequestContext, next: Handler<AbstractRequestContext, any>, context: AbstractRequestContext): Observable<any> {
        if (!(!input.method || input.method === HEAD || input.method === GET || input.method === '*')
            || !input.originalUrl) {
            return next.handle(input, context);
        }

        const options = this.options;
        const fileAdapter = context.get(FileAdapter);
        if (options.defer) {
            return next.handle(input, context)
                .pipe(
                    mergeMap(async res => {
                        const file = await this.find(input, fileAdapter, options)
                        if (!file) {
                            return throwError(() => new NotFoundException())
                        }
                        return file;
                    })
                )
        } else {
            return from(this.find(input, fileAdapter, options))
                .pipe(
                    mergeMap(file => {
                        if (!file) return next.handle(input, context)
                        return of(file);
                    })
                )
        }
    }

    protected find(ctx: AbstractRequestContext, fileAdapter: FileAdapter, options: ContentOptions) {
        if (ctx.statusAdapter && (isDefined(ctx.status) && !ctx.statusAdapter.isNotFound(ctx.status))) return Promise.resolve(null);

        return fileAdapter.find(ctx.originalUrl, options);


    }


}

/**
 * Static Content options.
 */

export interface ContentOptions<TStats = any> extends FindOptions {
    setHeaders?: (ctx: AbstractRequestContext, path: string, stats: TStats) => void;
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

