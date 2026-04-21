"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BodyparserInterceptor = exports.BodyparserOptions = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-control-regex */
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
const common_2 = require("@tsdi/common");
const transport_1 = require("@tsdi/common/transport");
const rxjs_1 = require("rxjs");
const qslib = require("qs");
let BodyparserOptions = class BodyparserOptions {
};
exports.BodyparserOptions = BodyparserOptions;
exports.BodyparserOptions = BodyparserOptions = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], BodyparserOptions);
let BodyparserInterceptor = class BodyparserInterceptor {
    constructor(options) {
        const json = { ...defaults.json, ...options?.json };
        const form = { ...defaults.form, ...options?.form };
        const text = { ...defaults.text, ...options?.text };
        this.options = { ...defaults, ...options, json, form, text };
        this.enableForm = this.enableType('form');
        this.enableJson = this.enableType('json');
        this.enableText = this.enableType('text');
        this.enableXml = this.enableType('xml');
    }
    canHanlde(input, streamAdapter) {
        return streamAdapter.isReadable(input)
            || streamAdapter.isReadable(input.body)
            || (0, transport_1.isBuffer)(input.body);
    }
    intercept(input, next, context) {
        const streamAdapter = context.get(common_1.StreamAdapter);
        if (!this.canHanlde(input, streamAdapter))
            return next.handle(input, context);
        return (0, rxjs_1.from)(this.parseBody(input, context))
            .pipe((0, rxjs_1.mergeMap)(psd => {
            input.body = psd.body ?? {};
            if ((0, ioc_1.isUndefined)(input.rawBody))
                input.rawBody = psd.raw;
            return next.handle(input, context);
        }));
    }
    parseBody(input, context) {
        const types = context.get(common_2.MimeTypes);
        const headerAdapter = context.get(common_1.HeaderAdapter);
        const mimeAdapter = context.get(common_1.MimeAdapter);
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
            return Promise.resolve({});
        }
        encoding ?? (encoding = identity);
        const streamAdapter = context.get(common_1.StreamAdapter);
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
    is(type, input, headerAdapter, mimeAdapter) {
        const ctype = headerAdapter.getContentType(input);
        if (!ctype)
            return false;
        if (!mimeAdapter) {
            const itype = (0, ioc_1.isArray)(type) ? type[0] : type;
            if (ctype.indexOf(itype) >= 0 || itype.indexOf(ctype) >= 0) {
                return itype;
            }
            return false;
        }
        const normaled = mimeAdapter.normalize(ctype);
        if (!normaled)
            return false;
        const types = (0, ioc_1.isArray)(type) ? type : [type];
        return mimeAdapter.match(types, normaled);
    }
    async parseJson(input, hdrcode, len, streamAdapter) {
        let length;
        if (len && hdrcode === identity) {
            length = ~~len;
        }
        const { limit, strict, encoding } = this.options.json;
        const str = (0, transport_1.isBuffer)(input.body) ? input.body.toString() : await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), {
            encoding,
            limit,
            length
        });
        try {
            const body = this.jsonify(str, strict);
            return {
                raw: str,
                body
            };
        }
        catch (err) {
            throw new core_1.InvalidJsonException(err, str);
        }
    }
    unzipify(input, streamAdapter, encoding) {
        switch (encoding) {
            case 'gzip':
            case 'deflate':
                break;
            case 'identity':
                if (streamAdapter.isReadable(input.body)) {
                    return input.body;
                }
                else if (streamAdapter.isStream(input.body)) {
                    return input.body.pipe(streamAdapter.createPassThrough());
                }
                if (streamAdapter.isReadable(input)) {
                    return input;
                }
                else if (streamAdapter.isStream(input)) {
                    return input.pipe(streamAdapter.createPassThrough());
                }
                throw new common_1.UnsupportedMediaTypeException('incoming message not support streamable');
            default:
                throw new common_1.UnsupportedMediaTypeException('Unsupported Content-Encoding: ' + encoding);
        }
        if (streamAdapter.isReadable(input.body) || streamAdapter.isStream(input.body)) {
            return input.body.pipe(streamAdapter.createGunzip());
        }
        if (streamAdapter.isReadable(input) || streamAdapter.isStream(input)) {
            return input.pipe(streamAdapter.createGunzip());
        }
        throw new common_1.UnsupportedMediaTypeException('incoming message not support streamable');
    }
    jsonify(str, strict) {
        if (!strict)
            return str ? JSON.parse(str) : str;
        // strict mode always return object
        if (!str)
            return {};
        // strict JSON test
        if (!strictJSONReg.test(str)) {
            throw new ioc_1.TypeException('invalid JSON, only supports object and array');
        }
        return JSON.parse(str);
    }
    async parseForm(input, hdrcode, len, streamAdapter) {
        let length;
        if (len && hdrcode === identity) {
            length = ~~len;
        }
        const { limit, queryString, encoding } = this.options.form;
        let qs = this.options.form.qs;
        if (!qs) {
            qs = qslib;
        }
        const str = (0, transport_1.isBuffer)(input.body) ? input.body.toString() : await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), {
            encoding,
            limit,
            length
        });
        try {
            const body = qs.parse(str, queryString);
            return {
                raw: str,
                body
            };
        }
        catch (err) {
            err.body = str;
            throw new common_1.BadRequestException(err.message);
        }
    }
    async parseText(input, hdrcode, len, streamAdapter) {
        let length;
        if (len && hdrcode === identity) {
            length = ~~len;
        }
        const { limit, encoding } = this.options.text;
        const str = (0, transport_1.isBuffer)(input.body) ? input.body.toString() : await streamAdapter.rawbody(this.unzipify(input, streamAdapter, hdrcode), {
            encoding,
            limit,
            length
        });
        return {
            raw: str,
            body: str
        };
    }
    enableType(type) {
        return this.options.enableTypes.includes(type) === true;
    }
    /**
     * Parse body without HTTP headers (e.g., for TCP microservice mode).
     * Try to detect content type from body content.
     */
    async parseBodyWithoutHeaders(input, context) {
        const streamAdapter = context.get(common_1.StreamAdapter);
        const { limit, encoding } = this.options.json;
        let str;
        if ((0, transport_1.isBuffer)(input.body)) {
            str = input.body.toString();
        }
        else if (streamAdapter.isReadable(input)) {
            str = await streamAdapter.rawbody(input, { encoding, limit });
        }
        else if (streamAdapter.isReadable(input.body)) {
            str = await streamAdapter.rawbody(input.body, { encoding, limit });
        }
        else if (input.body !== undefined) {
            // body is already parsed (object, string, etc.)
            return { body: input.body };
        }
        else {
            return {};
        }
        // Try to parse as JSON if it looks like JSON
        if (this.enableJson && strictJSONReg.test(str)) {
            try {
                const body = this.jsonify(str, false);
                return { raw: str, body };
            }
            catch {
                // Not valid JSON, return as text
            }
        }
        // Try to parse as form data if it looks like form data
        if (this.enableForm && str.indexOf('=') >= 0) {
            try {
                const qs = this.options.form.qs ?? qslib;
                const body = qs.parse(str, this.options.form.queryString);
                return { raw: str, body };
            }
            catch {
                // Not valid form data, return as text
            }
        }
        // Return as text
        return { raw: str, body: str };
    }
};
exports.BodyparserInterceptor = BodyparserInterceptor;
exports.BodyparserInterceptor = BodyparserInterceptor = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Nullable)()),
    tslib_1.__metadata("design:paramtypes", [BodyparserOptions])
], BodyparserInterceptor);
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
//# sourceMappingURL=bodyparser.js.map