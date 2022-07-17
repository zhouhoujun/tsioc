/* eslint-disable no-control-regex */
import { AssetContext, HeaderContext, Middleware, TransportContext, UnsupportedMediaTypeError } from '@tsdi/core';
import { Abstract, EMPTY_OBJ, Injectable, isFunction, isUndefined, Nullable } from '@tsdi/ioc';
import * as zlib from 'zlib';
import { Stream, Readable, PassThrough } from 'stream';
import * as getRaw from 'raw-body';
import * as qslib from 'qs';
import { hdr } from '../consts';
import { formTypes, jsonTypes, textTypes, xmlTypes } from '../utils';


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
    extendTypes?: ParseExtendTypes;
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
        extendTypes: ParseExtendTypes;
    };
    private enableForm: boolean;
    private enableJson: boolean;
    private enableText: boolean;
    private enableXml: boolean;

    constructor(@Nullable() options: PlayloadOptions) {
        const json = { ...defaults.json, ...options?.json };
        const form = { ...defaults.form, ...options?.form };
        const text = { ...defaults.text, ...options?.text };
        const extendTypes = {
            json: this.mergeType(jsonTypes, options?.extendTypes?.json),
            form: this.mergeType(formTypes, options?.extendTypes?.form),
            text: this.mergeType(textTypes, options?.extendTypes?.text),
            xml: this.mergeType(xmlTypes, options?.extendTypes?.xml),
        };
        this.options = { ...defaults, ...options, json, form, text, extendTypes };

        this.enableForm = this.chkType('form');
        this.enableJson = this.chkType('json');
        this.enableText = this.chkType('text');
        this.enableXml = this.chkType('xml');
    }

    async invoke(ctx: TransportContext & AssetContext, next: () => Promise<void>): Promise<void> {
        if (!isUndefined(ctx.request.body)) return await next();
        const res = await this.parseBody(ctx);
        ctx.request.body = res.body ?? {};
        if (isUndefined(ctx.request.rawBody)) ctx.request.rawBody = res.raw;
        await next()
    }

    parseBody(ctx: TransportContext & AssetContext): Promise<{ raw?: any, body?: any }> {
        const extendTypes = this.options.extendTypes;
        if (this.enableJson && ctx.is(extendTypes.json)) {
            return this.parseJson(ctx)
        }
        if (this.enableForm && ctx.is(extendTypes.form)) {
            return this.parseForm(ctx)
        }
        if (this.enableText && ctx.is(extendTypes.text)) {
            return this.parseText(ctx)
        }
        if (this.enableXml && ctx.is(extendTypes.xml)) {
            return this.parseText(ctx)
        }

        return Promise.resolve(EMPTY_OBJ)
    }

    protected async parseJson(ctx: TransportContext & HeaderContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.getHeader(hdr.CONTENT_ENCODING) as string || hdr.IDENTITY;
        let length: number | undefined;
        if (len && hdrcode === hdr.IDENTITY) {
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
            (err as any).status = ctx.adapter.badRequest;
            (err as any).body = str;
            throw err
        }
    }

    private getStream(ctx: TransportContext & HeaderContext, encoding: string): Readable {
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
                throw new UnsupportedMediaTypeError('Unsupported Content-Encoding: ' + encoding);
        }
        return (ctx.request as Readable).pipe(zlib.createUnzip())
    }

    private jsonify(str: string, strict?: boolean) {
        if (!strict) return str ? JSON.parse(str) : str;
        // strict mode always return object
        if (!str) return {};
        // strict JSON test
        if (!strictJSONReg.test(str)) {
            throw new SyntaxError('invalid JSON, only supports object and array')
        }
        return JSON.parse(str)
    }

    protected async parseForm(ctx: TransportContext & HeaderContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.getHeader(hdr.CONTENT_ENCODING) as string || hdr.IDENTITY;
        let length: number | undefined;
        if (len && hdrcode === hdr.IDENTITY) {
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
            (err as any).status = ctx.adapter.badRequest;
            (err as any).body = str;
            throw err
        }
    }

    protected async parseText(ctx: TransportContext & HeaderContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.getHeader(hdr.CONTENT_LENGTH);
        const hdrcode = ctx.getHeader(hdr.CONTENT_ENCODING) as string || hdr.IDENTITY;
        let length: number | undefined;
        if (len && hdrcode === hdr.IDENTITY) {
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

    private chkType(type: string) {
        return this.options.enableTypes.includes(type) === true
    }

    private mergeType(types: string[], pvdr?: string[]) {
        const merged = [...types];
        if (pvdr && pvdr.length) {
            pvdr.forEach(p => {
                if (merged.indexOf(p) < 0) {
                    merged.push(p)
                }
            })
        }
        return merged
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

export interface ParseExtendTypes {
    json: string[];
    form: string[];
    text: string[];
    xml: string[];
}

