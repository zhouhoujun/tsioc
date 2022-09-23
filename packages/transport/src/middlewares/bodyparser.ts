/* eslint-disable no-control-regex */
import { AssetContext, Middleware, ServerOpts, UnsupportedMediaTypeExecption } from '@tsdi/core';
import { Abstract, EMPTY_OBJ, Injectable, isUndefined, Nullable, TypeExecption } from '@tsdi/ioc';
import * as zlib from 'zlib';
import { Stream, Readable, PassThrough } from 'stream';
import * as getRaw from 'raw-body';
import * as qslib from 'qs';
import { hdr, identity } from '../consts';
import { MimeTypes } from '../mime';


@Abstract()
export class PlayloadOptions {

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
export class BodyparserMiddleware implements Middleware {

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

    constructor(@Nullable() options: PlayloadOptions) {
        const json = { ...defaults.json, ...options?.json };
        const form = { ...defaults.form, ...options?.form };
        const text = { ...defaults.text, ...options?.text };

        this.options = { ...defaults, ...options, json, form, text };

        this.enableForm = this.enableType('form');
        this.enableJson = this.enableType('json');
        this.enableText = this.enableType('text');
        this.enableXml = this.enableType('xml');
    }

    async invoke(ctx: AssetContext, next: () => Promise<void>): Promise<void> {
        if (!isUndefined(ctx.request.body)) return await next();
        const res = await this.parseBody(ctx);
        ctx.request.body = res.body ?? {};
        if (isUndefined(ctx.request.rawBody)) ctx.request.rawBody = res.raw;
        await next()
    }

    parseBody(ctx: AssetContext): Promise<{ raw?: any, body?: any }> {
        const types = ctx.get(MimeTypes);
        if (this.enableJson && ctx.is(types.json)) {
            return this.parseJson(ctx)
        }
        if (this.enableForm && ctx.is(types.form)) {
            return this.parseForm(ctx)
        }
        if (this.enableText && ctx.is(types.text)) {
            return this.parseText(ctx)
        }
        if (this.enableXml && ctx.is(types.xml)) {
            return this.parseText(ctx)
        }

        return Promise.resolve(EMPTY_OBJ)
    }

    protected async parseJson(ctx: AssetContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.getHeader(hdr.CONTENT_ENCODING) as string || identity;
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        const { limit, strict, encoding } = this.options.json;

        const str = await getRaw(this.getStream(ctx, hdrcode), {
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
            (err as any).status = ctx.transport.status.badRequest;
            (err as any).body = str;
            throw err
        }
    }

    private getStream(ctx: AssetContext, encoding: string): Readable {
        return this.unzipify(ctx, encoding);
    }

    protected unzipify(ctx: AssetContext, encoding: string) {
        switch (encoding) {
            case 'gzip':
            case 'deflate':
                break
            case 'identity':
                if (ctx.request instanceof Readable) {
                    return ctx.request
                }
                return (ctx.request as Stream).pipe(new PassThrough());
            default:
                throw new UnsupportedMediaTypeExecption('Unsupported Content-Encoding: ' + encoding);
        }
        const readable = ctx.request instanceof Readable ? ctx.request : (ctx.request as Stream).pipe(new PassThrough())
        return readable.pipe(zlib.createUnzip());
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

        const str = await getRaw(this.getStream(ctx, hdrcode), {
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
            (err as any).status = ctx.transport.status.badRequest;
            (err as any).body = str;
            throw err
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
        const str = await getRaw(this.getStream(ctx, hdrcode), {
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

