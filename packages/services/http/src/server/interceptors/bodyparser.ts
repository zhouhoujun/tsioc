/* eslint-disable no-control-regex */
import { Abstract, EMPTY_OBJ, Injectable, isUndefined, Nullable, TypeExecption } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { BadRequestExecption, UnsupportedMediaTypeExecption, IReadableStream, hdr, InvalidJsonException  } from '@tsdi/common/transport';
import { AssetContext, Middleware, MimeTypes } from '@tsdi/endpoints';
import { Observable, from, mergeMap } from 'rxjs';
import * as qslib from 'qs';


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
export class Bodyparser implements Middleware<AssetContext>, Interceptor<AssetContext> {

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

    constructor(@Nullable() options: PayloadOptions) {
        const json = { ...defaults.json, ...options?.json };
        const form = { ...defaults.form, ...options?.form };
        const text = { ...defaults.text, ...options?.text };

        this.options = { ...defaults, ...options, json, form, text };

        this.enableForm = this.enableType('form');
        this.enableJson = this.enableType('json');
        this.enableText = this.enableType('text');
        this.enableXml = this.enableType('xml');
    }

    intercept(input: AssetContext, next: Handler<AssetContext, any>): Observable<any> {
        if (!isUndefined(input.args.body)) return next.handle(input);
        return from(this.parseBody(input))
            .pipe(
                mergeMap(res => {
                    input.args.payload = input.args.body = res.body ?? {};
                    if (isUndefined(input.args.rawBody)) input.args.rawBody = res.raw;
                    return next.handle(input)
                })
            )
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        if (!isUndefined(ctx.args.body)) return await next();
        const res = await this.parseBody(ctx);
        ctx.args.payload = ctx.args.body = res.body ?? {};
        if (isUndefined(ctx.args.rawBody)) ctx.args.rawBody = res.raw;
        await next()
    }

    parseBody(context: AssetContext): Promise<{ raw?: any, body?: any }> {
        const types = context.get(MimeTypes);
        if (this.enableJson && context.is(types.json)) {
            return this.parseJson(context)
        }
        if (this.enableForm && context.is(types.form)) {
            return this.parseForm(context)
        }
        if (this.enableText && context.is(types.text)) {
            return this.parseText(context)
        }
        if (this.enableXml && context.is(types.xml)) {
            return this.parseText(context)
        }

        return Promise.resolve(EMPTY_OBJ)
    }

    protected async parseJson(context: AssetContext): Promise<{ raw?: any, body?: any }> {
        const len = context.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = context.getHeader(hdr.CONTENT_ENCODING) as string || identity;
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        const { limit, strict, encoding } = this.options.json;

        const str = await context.streamAdapter.rawbody(this.getStream(context, hdrcode), {
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

    private getStream(ctx: AssetContext, encoding: string): IReadableStream {
        return this.unzipify(ctx, encoding);
    }

    protected unzipify(ctx: AssetContext, encoding: string) {
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

    protected async parseForm(ctx: AssetContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.getHeader(hdr.CONTENT_ENCODING) as string || identity;
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

    protected async parseText(ctx: AssetContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.getHeader(hdr.CONTENT_ENCODING) as string || identity;
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

const identity = 'identity';
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

