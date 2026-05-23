import { isArray, isUndefined, TypeException } from '@tsdi/ioc';
import { Incoming, Outgoing, RequestHandler, BadRequestException, UnsupportedMediaTypeException, RequestInterceptor, RequestContext, ReadableLike, WritableLike, StreamAdapter, HeaderAdapter, MimeAdapter, MimeTypes, HttpStatusCode } from '@tsdi/common';
import { Observable, from, mergeMap } from 'rxjs';
import * as qslib from 'qs';
import { parseMultipartBody } from '../multipart';

export class BodyparserOptions {
    json?: {
        strict?: boolean;
        limit: string;
    };
    form?: {
        limit: string;
        qs?: { parse: Function };
        queryString?: {
            allowDots?: boolean;
        };
    };
    text?: {
        limit: string;
    };
    multipart?: {
        limit: string;
    };
    encoding?: string;
    enableTypes?: string[];
}

export class BodyparserInterceptor implements RequestInterceptor<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext> {

    private options: {
        json: {
            encoding: string;
            strict?: boolean;
            limit: string;
        };
        form: {
            encoding: string;
            qs?: { parse: Function };
            limit: string;
            queryString: {
                allowDots?: boolean;
            };
        };
        text: {
            encoding: string;
            limit: string;
        };
        multipart: {
            limit: string;
        };
        enableTypes: string[];
    };
    private enableForm: boolean;
    private enableJson: boolean;
    private enableText: boolean;
    private enableXml: boolean;
    private enableMultipart: boolean;

    constructor(options?: BodyparserOptions) {
        const json = { ...defaults.json, ...options?.json };
        const form = { ...defaults.form, ...options?.form };
        const text = { ...defaults.text, ...options?.text };
        const multipart = { ...defaults.multipart, ...options?.multipart };
        this.options = { ...defaults, ...options, json, form, text, multipart };
        this.enableForm = this.enableType('form');
        this.enableJson = this.enableType('json');
        this.enableText = this.enableType('text');
        this.enableXml = this.enableType('xml');
        this.enableMultipart = this.enableType('multipart');
    }

    protected canHanlde(input: ReadableLike<Incoming>, streamAdapter: StreamAdapter): boolean {
        return streamAdapter.isReadable(input)
            || streamAdapter.isReadable((input as any).body)
            || Buffer.isBuffer((input as any).body);
    }

    intercept(input: ReadableLike<Incoming>, next: RequestHandler<ReadableLike<Incoming>, WritableLike<Outgoing>, RequestContext>, context: RequestContext): Observable<any> {
        const streamAdapter = context.get(StreamAdapter);
        if (!this.canHanlde(input, streamAdapter)) {
            return next.handle(input, context);
        }
        return from(this.parseBody(input, context))
            .pipe(
                mergeMap(parsed => {
                    if (!isUndefined(parsed.body)) {
                        (input as any).body = parsed.body;
                    }
                    if (parsed.fields) {
                        (input as any).fields = parsed.fields;
                    }
                    if (parsed.files) {
                        (input as any).files = parsed.files;
                    }
                    if (isUndefined((input as any).rawBody) && !isUndefined(parsed.raw)) {
                        (input as any).rawBody = parsed.raw;
                    }
                    return next.handle(input, context);
                })
            );
    }

    private parseBody(input: ReadableLike<Incoming>, context: RequestContext): Promise<{ raw?: any; body?: any; fields?: Record<string, string>; files?: Record<string, any> }> {
        const types = context.get(MimeTypes);
        const headerAdapter = context.get(HeaderAdapter);
        const mimeAdapter = context.get(MimeAdapter);
        if (!headerAdapter) {
            return this.parseBodyWithoutHeaders(input, context);
        }

        let encoding = headerAdapter.getContentEncoding(input);
        const len = headerAdapter.getContentLength(input);
        const ctype = headerAdapter.getContentType(input);
        if (!ctype || (encoding && !len)) {
            return Promise.resolve({});
        }

        encoding ??= identity;
        const streamAdapter = context.get(StreamAdapter);
        if (this.enableMultipart && this.isMultipart(ctype, mimeAdapter)) {
            return this.parseMultipart(input, ctype, encoding, len, streamAdapter);
        }
        if (this.enableJson && this.is(types?.json ?? 'json', input, headerAdapter, mimeAdapter)) {
            return this.parseJson(input, encoding, len, streamAdapter);
        }
        if (this.enableForm && this.is(types?.form ?? 'form', input, headerAdapter, mimeAdapter)) {
            return this.parseForm(input, encoding, len, streamAdapter);
        }
        if (this.enableText && this.is(types?.text ?? 'text', input, headerAdapter, mimeAdapter)) {
            return this.parseText(input, encoding, len, streamAdapter);
        }
        if (this.enableXml && this.is(types?.xml ?? 'xml', input, headerAdapter, mimeAdapter)) {
            return this.parseText(input, encoding, len, streamAdapter);
        }

        return Promise.resolve({});
    }

    private is(type: string | string[], input: ReadableLike<Incoming>, headerAdapter: HeaderAdapter, mimeAdapter: MimeAdapter): string | null | false {
        const ctype = headerAdapter.getContentType(input);
        if (!ctype) {
            return false;
        }
        if (!mimeAdapter) {
            const expected = isArray(type) ? type[0] : type;
            return ctype.indexOf(expected) >= 0 || expected.indexOf(ctype) >= 0 ? expected : false;
        }
        const normalized = mimeAdapter.normalize(ctype);
        if (!normalized) {
            return false;
        }
        return mimeAdapter.match(isArray(type) ? type : [type], normalized);
    }

    private isMultipart(contentType: string, mimeAdapter?: MimeAdapter): boolean {
        if (!contentType) {
            return false;
        }
        const normalized = mimeAdapter?.normalize(contentType);
        const value = normalized || contentType;
        return value.includes('multipart/');
    }

    protected async parseJson(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{ raw?: any; body?: any }> {
        const length = len && hdrcode === identity ? ~~len : undefined;
        const { limit, strict, encoding } = this.options.json;
        const raw = Buffer.isBuffer((input as any).body)
            ? Buffer.from((input as any).body)
            : Buffer.from(await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), { encoding: null, limit, length }));
        const str = raw.toString(encoding as BufferEncoding);
        try {
            return {
                raw: str,
                body: this.jsonify(str, strict)
            };
        } catch (err) {
            throw new BadRequestException((err as Error).message, HttpStatusCode.BadRequest);
        }
    }

    protected async parseForm(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{ raw?: any; body?: any }> {
        const length = len && hdrcode === identity ? ~~len : undefined;
        const { limit, queryString, encoding } = this.options.form;
        const qs = this.options.form.qs ?? qslib;
        const raw = Buffer.isBuffer((input as any).body)
            ? Buffer.from((input as any).body)
            : Buffer.from(await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), { encoding: null, limit, length }));
        const str = raw.toString(encoding as BufferEncoding);
        try {
            return {
                raw: str,
                body: qs.parse(str, queryString)
            };
        } catch (err) {
            throw new BadRequestException((err as Error).message, HttpStatusCode.BadRequest);
        }
    }

    protected async parseText(input: ReadableLike<Incoming>, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{ raw?: any; body?: any }> {
        const length = len && hdrcode === identity ? ~~len : undefined;
        const { limit, encoding } = this.options.text;
        const raw = Buffer.isBuffer((input as any).body)
            ? Buffer.from((input as any).body)
            : Buffer.from(await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), { encoding: null, limit, length }));
        const str = raw.toString(encoding as BufferEncoding);
        return {
            raw: str,
            body: str
        };
    }

    protected async parseMultipart(input: ReadableLike<Incoming>, contentType: string, hdrcode: string, len: number, streamAdapter: StreamAdapter): Promise<{ raw?: any; body?: any; fields?: Record<string, string>; files?: Record<string, any> }> {
        const length = len && hdrcode === identity ? ~~len : undefined;
        const { limit } = this.options.multipart;
        const raw = Buffer.isBuffer((input as any).body)
            ? Buffer.from((input as any).body)
            : Buffer.from(await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), { encoding: null, limit, length }));
        const parsed = parseMultipartBody(raw, contentType);
        return {
            raw,
            body: parsed.body,
            fields: parsed.fields,
            files: parsed.files,
        };
    }

    protected unzipify(input: ReadableLike<Incoming>, streamAdapter: StreamAdapter, encoding: string) {
        switch (encoding) {
            case 'gzip':
            case 'deflate':
                break;
            case 'identity':
                if (streamAdapter.isReadable((input as any).body)) {
                    return (input as any).body;
                }
                if (streamAdapter.isStream((input as any).body)) {
                    return (input as any).body.pipe(streamAdapter.createPassThrough());
                }
                if (streamAdapter.isReadable(input)) {
                    return input;
                }
                if (streamAdapter.isStream(input)) {
                    return input.pipe(streamAdapter.createPassThrough());
                }
                throw new UnsupportedMediaTypeException('incoming message not support streamable', HttpStatusCode.UnsupportedMediaType);
            default:
                throw new UnsupportedMediaTypeException(`Unsupported Content-Encoding: ${encoding}`, HttpStatusCode.UnsupportedMediaType);
        }

        if (streamAdapter.isReadable((input as any).body) || streamAdapter.isStream((input as any).body)) {
            return (input as any).body.pipe(streamAdapter.createGunzip());
        }
        if (streamAdapter.isReadable(input) || streamAdapter.isStream(input)) {
            return input.pipe(streamAdapter.createGunzip());
        }
        throw new UnsupportedMediaTypeException('incoming message not support streamable', HttpStatusCode.UnsupportedMediaType);
    }

    private jsonify(str: string, strict?: boolean) {
        if (!strict) {
            return str ? JSON.parse(str) : str;
        }
        if (!str) {
            return {};
        }
        if (!strictJSONReg.test(str)) {
            throw new TypeException('invalid JSON, only supports object and array');
        }
        return JSON.parse(str);
    }

    private enableType(type: string): boolean {
        return this.options.enableTypes.includes(type);
    }

    protected async parseBodyWithoutHeaders(input: ReadableLike<Incoming>, context: RequestContext): Promise<{ raw?: any; body?: any }> {
        const streamAdapter = context.get(StreamAdapter);
        const { limit, encoding } = this.options.json;
        let str: string;
        if (Buffer.isBuffer((input as any).body)) {
            str = (input as any).body.toString();
        } else if (streamAdapter.isReadable(input)) {
            str = await streamAdapter.rawbody(input, { encoding, limit });
        } else if (streamAdapter.isReadable((input as any).body)) {
            str = await streamAdapter.rawbody((input as any).body, { encoding, limit });
        } else if ((input as any).body !== undefined) {
            return { body: (input as any).body };
        } else {
            return {};
        }

        if (this.enableJson && strictJSONReg.test(str)) {
            try {
                return { raw: str, body: this.jsonify(str, false) };
            } catch {
            }
        }
        if (this.enableForm && str.indexOf('=') >= 0) {
            try {
                const qs = this.options.form.qs ?? qslib;
                return { raw: str, body: qs.parse(str, this.options.form.queryString) };
            } catch {
            }
        }
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
    multipart: {
        limit: '10mb'
    },
    enableTypes: ['json', 'form']
};
