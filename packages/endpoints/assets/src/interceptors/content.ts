import { Injectable } from '@tsdi/ioc';
import { Interceptor, Handler } from '@tsdi/core';
import { GET, HEAD, MESSAGE } from '@tsdi/common';
import { NotFoundExecption } from '@tsdi/common/transport';
import { AssetContext, Middleware, ContentSendAdapter, ContentOptions } from '@tsdi/endpoints';
import { Observable, catchError, from, mergeMap, of, throwError } from 'rxjs';



/**
 * static content resources.
 */
@Injectable()
export class Content implements Middleware<AssetContext>, Interceptor<AssetContext> {

    options?: ContentOptions;

    constructor() { }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        if (!(ctx.method === HEAD || ctx.method === GET || ctx.method === MESSAGE)
            || !ctx.getRequestFilePath()) {
            return next();
        }

        const options = this.options ?? { ...defOpts, ...ctx.serverOptions.content };
        if (options.defer) {
            try {
                await next()
            } catch (err: any) {
                if (err instanceof NotFoundExecption) {
                    await this.send(ctx, options);
                    return;
                }
                throw err;
            }
        }
        const file = await this.send(ctx, options);
        if (!options.defer && !file) {
            await next()
        }
    }

    intercept(input: AssetContext, next: Handler<AssetContext, any>): Observable<any> {
        if (!(input.method === HEAD || input.method === GET || input.method === MESSAGE)
            || !input.getRequestFilePath()) {
            return next.handle(input);
        }

        const options = this.options ?? { ...defOpts, ...input.serverOptions.content };
        if (options.defer) {
            return next.handle(input)
                .pipe(
                    catchError((err, caught) => {
                        if (err instanceof NotFoundExecption) {
                            input.status = input.vaildator.notFound;
                            return of(input)
                        } else {
                            return throwError(() => err);
                        }
                    }),
                    mergeMap(async res => {
                        const file = await this.send(input, options)
                        if (!file) {
                            return throwError(() => new NotFoundExecption())
                        }
                    })
                )
        } else {
            return from(this.send(input, options))
                .pipe(
                    mergeMap(file => {
                        if (!file) return next.handle(input)
                        return of(file);
                    })
                )
        }
    }

    protected async send(ctx: AssetContext, options: ContentOptions) {
        let file = '';
        if (!ctx.vaildator.isNotFound(ctx.status)) return file;

        const sender = ctx.injector.get(ContentSendAdapter);
        file = await sender.send(ctx, options);

        return file;
    }

    static create(options?: ContentOptions): Content {
        const ct = new Content();
        ct.options = options;
        return ct;
    }

}

export const defOpts: ContentOptions = {
    root: 'public',
    index: 'index.html',
    maxAge: 0,
    defer: false,
    immutable: false,

}

