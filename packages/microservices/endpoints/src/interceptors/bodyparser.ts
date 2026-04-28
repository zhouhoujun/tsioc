/* eslint-disable no-control-regex */
import { Abstract, Injectable, isArray, isUndefined, Nullable, TypeException } from '@tsdi/ioc';
import { InvalidJsonException } from '@tsdi/core';
import { Incoming, Outgoing, RequestHandler, BadRequestException, UnsupportedMediaTypeException, RequestInterceptor, RequestContext, ReadableLike, WritableLike, StreamAdapter, HeaderAdapter, MimeAdapter } from '@tsdi/common';
import { MimeTypes } from '@tsdi/common';
import { isBuffer } from '@tsdi/common/transport';
import { Observable, from, mergeMap } from 'rxjs';
import * as qslib from 'qs';

@Abstract()
export class BodyparserOptions {

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
export class BodyparserInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext> {

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

    constructor(@Nullable() options: BodyparserOptions) {
        const json = { ...defaults.json, ...options?.json };
        const form = { ...defaults.form, ...options?.form };
        const text = { ...defaults.text, ...options?.text };

        this.options = { ...defaults, ...options, json, form, text };

        this.enableForm = this.enableType('form');
        this.enableJson = this.enableType('json');
        this.enableText = this.enableType('text');
        this.enableXml = this.enableType('xml');
    }

    protected canHanlde(input: ReadableLike<Incoming>, streamAdapter: StreamAdapter): boolean {
        return streamAdapter.isReadable(input)    
            || streamAdapter.isReadable(input.body)
            || isBuffer(input.body);
    }

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<any> {
        const streamAdapter = context.get(StreamAdapter);
        if (!this.canHanlde(input, streamAdapter)) return next.handle(input, context);
        return from(this.parseBody(input, context))
            .pipe(
                mergeMap(psd => {
                    input.body = psd.body ?? {};
                    if (isUndefined(input.rawBody)) input.rawBody = psd.raw;
                    return next.handle(input, context)
                })
            )
    }

    private parseBody(input: ReadableLike<Incoming>, context: RequestContext): Promise<{ raw?: any, body?: any }> {
        const types = context.get(MimeTypes);
        const headerAdapter = context.get(HeaderAdapter);
        const mimeAdapter = context.get(MimeAdapter);

        // If no headerAdapter (e.g., for TCP microservice without HTTP headers),
        // try to parse body directly from input
        if (!headerAdapter) {
            return this.parseBodyWithoutHeaders(input, context);
        }

        let encoding = headerAdapter.getContentEncoding(input);
        const len = headerAdapter.getContentLength(input);
        const ctype = headerAdapter.getContentType(input);
        //no body
        if (!ctype || (encoding && !len)) {
            return Promise.resolve({})
        }

        encoding ??= identity;

        const streamAdapter = context.get(StreamAdapter);

        if (this.enableJson && this.is(types?.json ?? 'json', input, headerAdapter, mimeAdapter)) {
            return this.parseJson(input, encoding, len, streamAdapter)
        }
        if (this.enableForm && this.is(types?.form ?? 'form', input, headerAdapter, mimeAdapter)) {
            return this.parseForm(input, encoding, len, streamAdapter)
        }
        if (this.enableText && this.is(types?.text ?? 'text', input, headerAdapter, mimeAdapter)) {
            return this.parseText(input, encoding, len, streamAdapter)
        }
        if (this.enableXml && this.is(types?.xml ?? 'xml', input, headerAdapter, mimeAdapter)) {
            return this.parseText(input, encoding, len, streamAdapter)
        }

        return Promise.resolve({})
    }

    private is(type: string | string[], input: ReadableLike<Incoming>, headerAdapter: HeaderAdapter, mimeAdapter: MimeAdapter): string | null | false {
        const ctype = headerAdapter.getContentType(input);
        if (!ctype) return false;
        if (!mimeAdapter) {
            const itype = isArray(type) ? type[0] : type;
            if (ctype.indexOf(itype) >= 0 || itype.indexOf(ctype) >= 0) {
                return itype;
            }
            return false;
        }
        const normaled = mimeAdapter.normalize(ctype);
        if (!normaled) return false;

        const types = isArray(type) ? type : [type];
        return mimeAdapter.match(types, normaled)
    }

    protected async parseJson(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{ raw?: any, body?: any }> {

        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        const { limit, strict, encoding } = this.options.json;

        const str = isBuffer(input.body) ? input.body.toString() : await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), {
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


    protected unzipify(input: ReadableLike<Incoming>, streamAdapter: StreamAdapter, encoding: string) {
        switch (encoding) {
            case 'gzip':
            case 'deflate':
                break
            case 'identity':
                if (streamAdapter.isReadable(input.body)) {
                    return input.body
                } else if (streamAdapter.isStream(input.body)) {
                    return input.body.pipe(streamAdapter.createPassThrough());
                }

                if (streamAdapter.isReadable(input)) {
                    return input
                } else if (streamAdapter.isStream(input)) {
                    return input.pipe(streamAdapter.createPassThrough());
                }
                throw new UnsupportedMediaTypeException('incoming message not support streamable');
            default:
                throw new UnsupportedMediaTypeException('Unsupported Content-Encoding: ' + encoding);
        }

        if (streamAdapter.isReadable(input.body) || streamAdapter.isStream(input.body)) {
            return input.body.pipe(streamAdapter.createGunzip());
        }
        if (streamAdapter.isReadable(input) || streamAdapter.isStream(input)) {
            return input.pipe(streamAdapter.createGunzip());
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

    protected async parseForm(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{ raw?: any, body?: any }> {
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }

        const { limit, queryString, encoding } = this.options.form;
        let qs = this.options.form.qs;
        if (!qs) {
            qs = qslib
        }

        const str = isBuffer(input.body) ? input.body.toString() : await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), {
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

    protected async parseText(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{ raw?: any, body?: any }> {
        let length: number | undefined;
        if (len && hdrcode === identity) {
            length = ~~len
        }
        const { limit, encoding } = this.options.text;
        const str = isBuffer(input.body) ? input.body.toString() : await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), {
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

    /**
     * Parse body without HTTP headers (e.g., for TCP microservice mode).
     * Try to detect content type from body content.
     */
    protected async parseBodyWithoutHeaders(input: ReadableLike<Incoming>, context: RequestContext): Promise<{ raw?: any, body?: any }> {
        const streamAdapter = context.get(StreamAdapter);
        const { limit, encoding } = this.options.json;

        let str: string;
        if (isBuffer(input.body)) {
            str = input.body.toString();
        } else if (streamAdapter.isReadable(input)) {
            str = await streamAdapter.rawbody(input, { encoding, limit });
        } else if (streamAdapter.isReadable(input.body)) {
            str = await streamAdapter.rawbody(input.body, { encoding, limit });
        } else if (input.body !== undefined) {
            // body is already parsed (object, string, etc.)
            return { body: input.body };
        } else {
            return {};
        }

        // Try to parse as JSON if it looks like JSON
        if (this.enableJson && strictJSONReg.test(str)) {
            try {
                const body = this.jsonify(str, false);
                return { raw: str, body };
            } catch {
                // Not valid JSON, return as text
            }
        }

        // Try to parse as form data if it looks like form data
        if (this.enableForm && str.indexOf('=') >= 0) {
            try {
                const qs = this.options.form.qs ?? qslib;
                const body = qs.parse(str, this.options.form.queryString);
                return { raw: str, body };
            } catch {
                // Not valid form data, return as text
            }
        }

        // Return as text
        return { raw: str, body: str };
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

