import { Injectable, tokenId } from '@tsdi/ioc';
import { Interceptor, Handler } from '@tsdi/core';
import { GET, HEAD, MESSAGE, NotFoundExecption } from '@tsdi/common';
import { Observable, catchError, from, mergeMap, of, throwError } from 'rxjs';
import { Middleware } from '../middleware/middleware';
import { ContentOptions, ContentSendAdapter } from '../send';
import { TransportContext } from '../TransportContext';



/**
 * static content resources.
 */
@Injectable()
export class Content implements Middleware<TransportContext>, Interceptor<TransportContext> {

    options?: ContentOptions;

    constructor() { }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
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

    intercept(input: TransportContext, next: Handler<TransportContext, any>): Observable<any> {
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

    protected async send(ctx: TransportContext, options: ContentOptions) {
        let file = '';
        if (ctx.statusAdapter && !ctx.statusAdapter.isNotFound(ctx.status)) return file;

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
