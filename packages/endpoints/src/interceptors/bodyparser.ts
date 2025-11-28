/* eslint-disable no-control-regex */
import { Abstract, Injectable, isUndefined, Nullable, TypeException } from '@tsdi/ioc';
import { InvalidJsonException } from '@tsdi/core';
import { RequestHandler, BadRequestException, UnsupportedMediaTypeException, RequestInterceptor, RequestContext } from '@tsdi/common';
import { IReadable, MimeTypes, isBuffer } from '@tsdi/common/transport';
import { Observable, from, mergeMap } from 'rxjs';
import * as qslib from 'qs';
import { AbstractRequestContext } from '../AbstractRequestContext';


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
export class BodyparserInterceptor implements RequestInterceptor<AbstractRequestContext> {

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

    protected canHanlde(input: AbstractRequestContext): boolean {
        return (isUndefined(input.request.body) && input.streamAdapter.isReadable(input.request))
            || input.streamAdapter.isReadable(input.request.body)
            || isBuffer(input.request.body);
    }

    intercept(input: AbstractRequestContext, next: RequestHandler<AbstractRequestContext, any>, context: RequestContext): Observable<any> {
        if (!this.canHanlde(input)) return next.handle(input, context);
        return from(this.parseBody(input))
            .pipe(
                mergeMap(res => {
                    input.request.body = res.body ?? {};
                    if (isUndefined(input.request.rawBody)) input.request.rawBody = res.raw;
                    return next.handle(input, context)
                })
            )
    }

    private parseBody(context: AbstractRequestContext): Promise<{ raw?: any, body?: any }> {
        const types = context.get(MimeTypes);
        if (this.enableJson && context.is(types?.json ?? 'json')) {
            return this.parseJson(context)
        }
        if (this.enableForm && context.is(types?.form ?? 'form')) {
            return this.parseForm(context)
        }
        if (this.enableText && context.is(types?.text ?? 'text')) {
            return this.parseText(context)
        }
        if (this.enableXml && context.is(types?.xml ?? 'xml')) {
            return this.parseText(context)
        }

        return Promise.resolve({})
    }

    protected async parseJson(context: AbstractRequestContext): Promise<{ raw?: any, body?: any }> {
        const len = context.getContentLength();
        const hdrcode = context.getContentEncoding() as string || identity;
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        const { limit, strict, encoding } = this.options.json;

        const str = isBuffer(context.request.body)? context.request.body.toString() : await context.streamAdapter.rawbody(this.getStream(context, hdrcode), {
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

    private getStream(ctx: AbstractRequestContext, encoding: string): IReadable {
        return this.unzipify(ctx, encoding);
    }

    protected unzipify(ctx: AbstractRequestContext, encoding: string) {
        switch (encoding) {
            case 'gzip':
            case 'deflate':
                break
            case 'identity':
                if (ctx.streamAdapter.isReadable(ctx.request.body)) {
                    return ctx.request.body
                } else if (ctx.streamAdapter.isStream(ctx.request.body)) {
                    return ctx.request.body.pipe(ctx.streamAdapter.createPassThrough());
                }

                if (ctx.streamAdapter.isReadable(ctx.request)) {
                    return ctx.request
                } else if (ctx.streamAdapter.isStream(ctx.request)) {
                    return ctx.request.pipe(ctx.streamAdapter.createPassThrough());
                }
                throw new UnsupportedMediaTypeException('incoming message not support streamable');
            default:
                throw new UnsupportedMediaTypeException('Unsupported Content-Encoding: ' + encoding);
        }

        if (ctx.streamAdapter.isReadable(ctx.request.body) || ctx.streamAdapter.isStream(ctx.request.body)) {
            return ctx.request.body.pipe(ctx.streamAdapter.createGunzip());
        }
        if (ctx.streamAdapter.isReadable(ctx.request) || ctx.streamAdapter.isStream(ctx.request)) {
            return ctx.request.pipe(ctx.streamAdapter.createGunzip());
        }
        throw new UnsupportedMediaTypeException('incoming message not support streamable');
    }

    private jsonify(str: string, strict?: boolean) {
        if (!strict) return str ? JSON.parse(str) : str;
        // strict mode always return object
        if (!str) return {};
        // strict JSON test
        if (!strictJSONReg.test(str)) {
            throw new TypeException('invalid JSON, only supports object and array')
        }
        return JSON.parse(str)
    }

    protected async parseForm(ctx: AbstractRequestContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.getContentLength();
        const hdrcode = ctx.getContentEncoding() as string || identity;
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }

        const { limit, queryString, encoding } = this.options.form;
        let qs = this.options.form.qs;
        if (!qs) {
            qs = qslib
        }

        const str = isBuffer(ctx.request.body)? ctx.request.body.toString() : await ctx.streamAdapter.rawbody(this.getStream(ctx, hdrcode), {
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
            throw new BadRequestException((err as any).message);
        }
    }

    protected async parseText(ctx: AbstractRequestContext): Promise<{ raw?: any, body?: any }> {
        const len = ctx.getContentLength();
        const hdrcode = ctx.getContentEncoding() as string || identity;
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        const { limit, encoding } = this.options.text;
        const str = isBuffer(ctx.request.body)? ctx.request.body.toString() : await ctx.streamAdapter.rawbody(this.getStream(ctx, hdrcode), {
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
    extendTypes: {}
};

