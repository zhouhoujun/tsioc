"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcceptsPriorityImpl = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-useless-escape */
const ioc_1 = require("@tsdi/ioc");
let AcceptsPriorityImpl = class AcceptsPriorityImpl {
    priority(accept, accepts, type) {
        let accepted;
        let specifyFn;
        switch (type) {
            case 'lang':
                accepted = this.parseLanguage(accept);
                specifyFn = (value, spec, index) => this.langSpecify(value, spec, index);
                break;
            case 'media':
                accepted = this.parseMedia(accept);
                specifyFn = (value, spec, index) => this.mediaSpecify(value, spec, index);
                break;
            case 'charsets':
                accepted = this.parseCharset(accept);
                specifyFn = (value, spec, index) => this.specify(value, spec, index);
                break;
            case 'encodings':
                accepted = this.parseEncoding(accept);
                specifyFn = (value, spec, index) => this.specify(value, spec, index);
                break;
        }
        const specify = accepts.map((a, i) => this.getPriority(a, accepted, i, specifyFn));
        if (!specify || !specify.length)
            return [];
        return this.sortSpecify(specify).map(p => accepts[specify.indexOf(p)]);
    }
    /**
     * Check if the given `type(s)` is acceptable, returning
     * the best match when true, otherwise `false`, in which
     * case you should respond with 406 "Not Acceptable".
     *
     * The `type` value may be a single mime type string
     * such as "application/json", the extension name
     * such as "json" or an array `["json", "html", "text/plain"]`. When a list
     * or array is given the _best_ match, if any is returned.
     *
     * Examples:
     *
     *     // Accept: text/html
     *     this.accepts('html');
     *     // => "html"
     *
     *     // Accept: text/*, application/json
     *     this.accepts('html');
     *     // => "html"
     *     this.accepts('text/html');
     *     // => "text/html"
     *     this.accepts('json', 'text');
     *     // => "json"
     *     this.accepts('application/json');
     *     // => "application/json"
     *
     *     // Accept: text/*, application/json
     *     this.accepts('image/png');
     *     this.accepts('png');
     *     // => false
     *
     *     // Accept: text/*;q=.5, application/json
     *     this.accepts('html', 'json');
     *     // => "json"
     *
     * @param {String|Array} type(s)...
     * @return {String|Array|false}
     * @api public
     */
    accepts(incoming, headerAdapter, mimeAdapter, ...args) {
        const accepts = headerAdapter.getAccept(incoming) ?? '*';
        if (!args.length) {
            return accepts ?? false;
        }
        const medias = args.map(a => a.indexOf('/') === -1 ? mimeAdapter?.lookup(a) ?? a : a).filter(a => (0, ioc_1.isString)(a));
        return ioc_1.lang.first(this.priority(accepts, medias, 'media')) ?? false;
    }
    /**
    * Return accepted encodings or best fit based on `encodings`.
    *
    * Given `Accept-Encoding: gzip, deflate`
    * an array sorted by quality is returned:
    *
    *     ['gzip', 'deflate']
    *
    * @param {String|Array} encoding(s)...
    * @return {String|Array}
    * @api public
    */
    acceptsEncodings(incoming, headerAdapter, ...encodings) {
        const accepts = headerAdapter.getAcceptEncoding(incoming) ?? '*';
        if (!encodings.length) {
            return accepts;
        }
        return ioc_1.lang.first(this.priority(accepts, encodings, 'encodings')) ?? false;
    }
    /**
     * Return accepted charsets or best fit based on `charsets`.
     *
     * Given `Accept-Charset: utf-8, iso-8859-1;q=0.2, utf-7;q=0.5`
     * an array sorted by quality is returned:
     *
     *     ['utf-8', 'utf-7', 'iso-8859-1']
     *
     * @param {String|Array} charset(s)...
     * @return {String|Array}
     * @api public
     */
    acceptsCharsets(incoming, headerAdapter, ...charsets) {
        const accepts = headerAdapter.getAcceptCharset(incoming) ?? '*';
        if (!charsets.length) {
            return accepts;
        }
        return ioc_1.lang.first(this.priority(accepts, charsets, 'charsets')) ?? false;
    }
    /**
     * Return accepted languages or best fit based on `langs`.
     *
     * Given `Accept-Language: en;q=0.8, es, pt`
     * an array sorted by quality is returned:
     *
     *     ['es', 'pt', 'en']
     *
     * @param {String|Array} lang(s)...
     * @return {Array|String}
     * @api public
     */
    acceptsLanguages(incoming, headerAdapter, ...langs) {
        const accepts = headerAdapter.getAcceptLanguage(incoming) ?? '*';
        if (!langs.length) {
            return accepts;
        }
        return ioc_1.lang.first(this.priority(accepts, langs, 'lang')) ?? false;
    }
    parseCharset(aspect) {
        const aspects = (0, ioc_1.isString)(aspect) ? aspect.split(',') : aspect;
        const ch = [];
        aspects.forEach((str, idx) => {
            const info = this.matchify(str, idx);
            if (info) {
                ch.push(info);
            }
        });
        return ch;
    }
    parseEncoding(encoding) {
        const accepts = (0, ioc_1.isArray)(encoding) ? encoding : encoding.split(',');
        let hasIdentity = false;
        let minQuality = 1;
        const encodings = [];
        accepts.forEach((a, i) => {
            const enco = this.matchify(a.trim(), i);
            if (enco) {
                encodings.push(enco);
                hasIdentity = hasIdentity || this.specify('identity', enco) !== null;
                minQuality = Math.min(minQuality, enco.q || 1);
            }
        });
        if (hasIdentity) {
            encodings.push({
                value: 'identity',
                q: minQuality,
                i: accepts.length
            });
        }
        return encodings;
    }
    sortAsccepted(accepted) {
        return accepted.filter(a => a.q > 0)
            .sort((a, b) => (b.q - a.q) || (a.i - b.i) || 0);
    }
    getValues(accepted) {
        return this.sortAsccepted(accepted).map(a => a.value);
    }
    sortSpecify(specify) {
        return specify.filter(p => p.q > 0)
            .sort((a, b) => (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || 0);
    }
    matchify(str, i) {
        const match = charsetRegExp.exec(str);
        if (!match)
            return null;
        const charset = match[1].toString();
        let q = 1;
        if (match[2]) {
            const params = match[2].split(';');
            for (let j = 0; j < params.length; j++) {
                const p = params[j].trim().split('=');
                if (p[0] === 'q') {
                    q = parseFloat(p[1]);
                    break;
                }
            }
        }
        return {
            value: charset,
            q: q,
            i: i
        };
    }
    getPriority(value, accepted, index, specify) {
        let priority = { o: -1, q: 0, s: 0 };
        for (let i = 0; i < accepted.length; i++) {
            const spec = specify(value, accepted[i], index);
            if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
                priority = spec;
            }
        }
        return priority;
    }
    specify(value, spec, index) {
        let s = 0;
        if (spec.value.toLowerCase() === value.toLowerCase()) {
            s |= 1;
        }
        else if (spec.value !== '*') {
            return null;
        }
        return {
            i: index,
            o: spec.i,
            q: spec.q,
            s: s
        };
    }
    langSpecify(language, spec, index) {
        const p = this.langMatchify(language);
        if (!p)
            return null;
        let s = 0;
        if (spec.value.toLowerCase() === p.value.toLowerCase()) {
            s |= 4;
        }
        else if (spec.prefix.toLowerCase() === p.value.toLowerCase()) {
            s |= 2;
        }
        else if (spec.value.toLowerCase() === p.prefix.toLowerCase()) {
            s |= 1;
        }
        else if (spec.value !== '*') {
            return null;
        }
        return {
            i: index,
            o: spec.i,
            q: spec.q,
            s: s
        };
    }
    parseLanguage(aspect) {
        const aspects = (0, ioc_1.isString)(aspect) ? aspect.split(',') : aspect;
        const langs = [];
        aspects.forEach((str, idx) => {
            const info = this.langMatchify(str, idx);
            if (info) {
                langs.push(info);
            }
        });
        return langs;
    }
    langMatchify(str, i = 0) {
        const match = langRegExp.exec(str);
        if (!match)
            return null;
        const prefix = match[1], suffix = match[2];
        let full = prefix;
        if (suffix)
            full += "-" + suffix;
        let q = 1;
        if (match[3]) {
            const params = match[3].split(';');
            for (let j = 0; j < params.length; j++) {
                const p = params[j].split('=');
                if (p[0] === 'q')
                    q = parseFloat(p[1]);
            }
        }
        return {
            prefix: prefix,
            suffix: suffix,
            q: q,
            i: i,
            value: full
        };
    }
    parseMedia(accept) {
        const accepts = (0, ioc_1.isArray)(accept) ? accept : accept.split(',');
        let j = 0;
        for (let i = 1; i < accepts.length; i++) {
            if (this.quoteCount(accepts[j]) % 2 == 0) {
                accepts[++j] = accepts[i];
            }
            else {
                accepts[j] += ',' + accepts[i];
            }
        }
        // trim accepts
        accepts.length = j + 1;
        const medias = [];
        accepts.forEach((v, i) => {
            const media = this.mediaMatchify(v.trim(), i);
            if (media) {
                medias.push(media);
            }
        });
        return medias;
    }
    mediaMatchify(str, i = 0) {
        const match = mediaRegExp.exec(str);
        if (!match)
            return null;
        const params = Object.create(null);
        let q = 1;
        const subtype = match[2];
        const type = match[1];
        if (match[3]) {
            const kvps = this.splitParameters(match[3]).map(this.splitKeyValuePair);
            for (let j = 0; j < kvps.length; j++) {
                const pair = kvps[j];
                const key = pair[0]?.toLowerCase();
                const val = pair[1];
                // get the value, unwrapping quotes
                const value = val && val[0] === '"' && val[val.length - 1] === '"'
                    ? val.substring(1, val.length - 2)
                    : val;
                if (key === 'q' && value) {
                    q = parseFloat(value);
                    break;
                }
                if (key) {
                    // store parameter
                    params[key] = value;
                }
            }
        }
        return {
            type,
            subtype,
            params,
            value: `${type}/${subtype}`,
            q,
            i
        };
    }
    quoteCount(str) {
        let count = 0;
        let index = 0;
        while ((index = str.indexOf('"', index)) !== -1) {
            count++;
            index++;
        }
        return count;
    }
    mediaSpecify(type, spec, index) {
        const p = this.mediaMatchify(type);
        let s = 0;
        if (!p) {
            return null;
        }
        if (spec.type.toLowerCase() == p.type.toLowerCase()) {
            s |= 4;
        }
        else if (spec.type != '*') {
            return null;
        }
        if (spec.subtype.toLowerCase() == p.subtype.toLowerCase()) {
            s |= 2;
        }
        else if (spec.subtype != '*') {
            return null;
        }
        const keys = Object.keys(spec.params);
        if (keys.length > 0) {
            if (keys.every(k => {
                return spec.params[k] == '*' || (spec.params[k] || '').toLowerCase() == (p.params[k] || '').toLowerCase();
            })) {
                s |= 1;
            }
            else {
                return null;
            }
        }
        return {
            i: index,
            o: spec.i,
            q: spec.q,
            s: s
        };
    }
    splitParameters(str) {
        const parameters = str.split(';');
        let j = 0;
        for (let i = 1; i < parameters.length; i++) {
            if (this.quoteCount(parameters[j]) % 2 == 0) {
                parameters[++j] = parameters[i];
            }
            else {
                parameters[j] += ';' + parameters[i];
            }
        }
        // trim parameters
        parameters.length = j + 1;
        for (let i = 0; i < parameters.length; i++) {
            parameters[i] = parameters[i].trim();
        }
        return parameters;
    }
    splitKeyValuePair(str) {
        const index = str.indexOf('=');
        let key;
        let val;
        if (index === -1) {
            key = str;
        }
        else {
            key = str.substring(0, index);
            val = str.substring(index + 1);
        }
        return [key, val];
    }
};
exports.AcceptsPriorityImpl = AcceptsPriorityImpl;
exports.AcceptsPriorityImpl = AcceptsPriorityImpl = tslib_1.__decorate([
    (0, ioc_1.Injectable)({ static: true })
], AcceptsPriorityImpl);
const charsetRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
const langRegExp = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;
const mediaRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;
//# sourceMappingURL=accepts.js.map