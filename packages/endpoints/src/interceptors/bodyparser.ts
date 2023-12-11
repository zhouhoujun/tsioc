/* eslint-disable no-control-regex */
import { Abstract, EMPTY_OBJ, Injectable, isUndefined, Optional, TypeExecption } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { BadRequestExecption, UnsupportedMediaTypeExecption, identity, IReadableStream, InvalidJsonException, Incoming } from '@tsdi/common';
import { Observable, from, mergeMap } from 'rxjs';
import * as qslib from 'qs';
import { Middleware } from '../middleware/middleware';
import { TransportContext } from '../TransportContext';


@Abstract()
export class PayloadOptions {

    json?: {
        strict?: boolean;
        limit: string
    };
    form?: {
        limit: string,
        qs?: { parse: Function },
        queryString?: {
            allowDots?: boolean
        }
    };
    text?: {
        limit: string;
    };
    encoding?: string;
    enableTypes?: string[];
}

@Injectable()
export class Bodyparser implements Middleware<TransportContext>, Interceptor<TransportContext> {

    private options: {
        json: {
            encoding: string;
            strict?: boolean;
            limit: string
        },
        form: {
            encoding: string;
            qs?: { parse: Function }
            limit: string,
            queryString: {
                allowDots?: boolean
            }
        },
        text: {
            encoding: string;
            limit: string;
        },
        enableTypes: string[];
    };
    private enableForm: boolean;
    private enableJson: boolean;
    private enableText: boolean;
    private enableXml: boolean;

    constructor(@Optional() options: PayloadOptions) {
        const json = { ...defaults.json, ...options?.json };
        const form = { ...defaults.form, ...options?.form };
        const text = { ...defaults.text, ...options?.text };

        this.options = { ...defaults, ...options, json, form, text };

        this.enableForm = this.enableType('form');
        this.enableJson = this.enableType('json');
        this.enableText = this.enableType('text');
        this.enableXml = this.enableType('xml');
    }

    intercept(ctx: TransportContext, next: Handler<TransportContext, any>): Observable<any> {
        if (!isUndefined(ctx.request.body) || !ctx.incomingAdapter || !ctx.mimeAdapter || !(ctx.streamAdapter.isReadable(ctx.request) || ctx.streamAdapter.isStream(ctx.request))) return next.handle(ctx);
        return from(this.parseBody(ctx))
            .pipe(
                mergeMap(res => {
                    const request = ctx.request as Incoming;
                    request.payload = request.body = res.body ?? {};
                    if (isUndefined(request.rawBody)) request.rawBody = res.raw;
                    return next.handle(ctx)
                })
            )
    }

    async invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        if (!isUndefined(ctx.request.body) || !ctx.incomingAdapter || !ctx.mimeAdapter || !(ctx.streamAdapter.isReadable(ctx.request) || ctx.streamAdapter.isStream(ctx.request))) return await next();
        const res = await this.parseBody(ctx);
        const request = ctx.request as Incoming;
        request.payload = request.body = res.body ?? {};
        if (isUndefined(request.rawBody)) request.rawBody = res.raw;
        await next()
    }

    parseBody(context: TransportContext): Promise<{ raw?: any, body?: any }> {
        const session = context.session;
        const contentType = session.incomingAdapter?.getContentType(context.request);
        if (!contentType) return this.parseJson(context);

        if (this.enableJson && session.mimeAdapter?.isJson(contentType)) {
            return this.parseJson(context)
        }
        if (this.enableForm && session.mimeAdapter?.isForm(contentType)) {
            return this.parseForm(context)
        }
        if (this.enableText && session.mimeAdapter?.isText(contentType)) {
            return this.parseText(context)
        }
        if (this.enableXml && session.mimeAdapter?.isXml(contentType)) {
            return this.parseText(context)
        }

        return Promise.resolve(EMPTY_OBJ)
    }

    protected async parseJson(ctx: TransportContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.incomingAdapter?.getContentLength(ctx.request); // ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.incomingAdapter?.getContentEncoding(ctx.request) || identity; // ctx.getHeader(hdr.CONTENT_ENCODING) as string || identity;
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        const { limit, strict, encoding } = this.options.json;

        const str = await ctx.streamAdapter.rawbody(this.getStream(ctx, hdrcode), {
            encoding,
            limit,
            length
        });
        try {
            const body = this.jsonify(str, strict);
            return {
                raw: str,
                body
            }
        } catch (err) {
            throw new InvalidJsonException(err, str);
        }
    }

    private getStream(ctx: TransportContext, encoding: string): IReadableStream {
        return this.unzipify(ctx, encoding);
    }

    protected unzipify(ctx: TransportContext, encoding: string) {
        switch (encoding) {
            case 'gzip':
            case 'deflate':
                break
            case 'identity':
                if (ctx.streamAdapter.isReadable(ctx.request)) {
                    return ctx.request
                } else if (ctx.streamAdapter.isStream(ctx.request)) {
                    return ctx.request.pipe(ctx.streamAdapter.createPassThrough());
                }
                throw new UnsupportedMediaTypeExecption('incoming message not support streamable');
            default:
                throw new UnsupportedMediaTypeExecption('Unsupported Content-Encoding: ' + encoding);
        }
        if (ctx.streamAdapter.isReadable(ctx.request) || ctx.streamAdapter.isStream(ctx.request)) {
            return ctx.request.pipe(ctx.streamAdapter.createGunzip());
        }
        throw new UnsupportedMediaTypeExecption('incoming message not support streamable');
    }

    private jsonify(str: string, strict?: boolean) {
        if (!strict) return str ? JSON.parse(str) : str;
        // strict mode always return object
        if (!str) return {};
        // strict JSON test
        if (!strictJSONReg.test(str)) {
            throw new TypeExecption('invalid JSON, only supports object and array')
        }
        return JSON.parse(str)
    }

    protected async parseForm(ctx: TransportContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.incomingAdapter?.getContentLength(ctx.request); // ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.incomingAdapter?.getContentEncoding(ctx.request) || identity; // ctx.getHeader(hdr.CONTENT_ENCODING) as string || identity;
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }

        const { limit, queryString, encoding } = this.options.form;
        let qs = this.options.form.qs;
        if (!qs) {
            qs = qslib
        }

        const str = await ctx.streamAdapter.rawbody(this.getStream(ctx, hdrcode), {
            encoding,
            limit,
            length
        });
        try {
            const body = qs.parse(str, queryString);
            return {
                raw: str,
                body
            }
        } catch (err) {
            (err as any).body = str;
            throw new BadRequestExecption((err as any).message);
        }
    }

    protected async parseText(ctx: TransportContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.incomingAdapter?.getContentLength(ctx.request); // ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.incomingAdapter?.getContentEncoding(ctx.request) || identity; // ctx.getHeader(hdr.CONTENT_ENCODING) as string || identity;
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        const { limit, encoding } = this.options.text;
        const str = await ctx.streamAdapter.rawbody(this.getStream(ctx, hdrcode), {
            encoding,
            limit,
            length
        });
        return {
            raw: str,
            body: str
        }
    }

    private enableType(type: string): boolean {
        return this.options.enableTypes.includes(type) === true
    }
}

const strictJSONReg = /^[\x20\x09\x0a\x0d]*(\[|\{)/;

const defaults = {
    json: {
        encoding: 'utf8',
        limit: '1mb'
    },
    form: {
        encoding: 'utf8',
        limit: '100kb',
        queryString: {
            allowDots: true
        }
    },
    text: {
        encoding: 'utf8',
        limit: '1mb'
    },
    enableTypes: ['json', 'form'],
    extendTypes: EMPTY_OBJ
};

