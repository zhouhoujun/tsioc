"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentType = exports.HeaderAdapter = exports.HeaderMappings = void 0;
exports.hasHeader = hasHeader;
exports.getHeader = getHeader;
exports.getHeaders = getHeaders;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
/**
 * header mappings.
 */
class HeaderMappings {
    /**
     * create headers map.
     * @param headers
     */
    constructor(headers) {
        this._hdrs = new Map();
        this._normal = new Map();
        if (headers) {
            if ((0, ioc_1.isString)(headers)) {
                headers.split('\n').forEach(line => {
                    const index = line.indexOf(':');
                    if (index > 0) {
                        const name = line.slice(0, index);
                        const value = line.slice(index + 1).trim();
                        this.append(name, value);
                    }
                });
            }
            else if (headers instanceof HeaderMappings) {
                headers.forEach((n, v) => {
                    this.set(n, v);
                });
            }
            else {
                this.setHeaders(headers);
            }
        }
    }
    get size() {
        return this._hdrs.size;
    }
    getHeaderNames() {
        return Array.from(this._normal.keys());
    }
    getHeaders() {
        if (!this._rcd) {
            const rcd = this._rcd = {};
            this.forEach((v, k) => {
                rcd[v] = k;
            });
        }
        return this._rcd;
    }
    setHeaders(headers) {
        if (!headers)
            return;
        if (headers.getHeaderNames) {
            headers.getHeaderNames?.().forEach(n => this.set(n, headers.getHeader?.(n)));
        }
        else {
            for (const f in headers) {
                this.set(f, headers[f]);
            }
        }
        this._rcd = null;
    }
    getHeader(name) {
        const values = this._hdrs.get(name.toLowerCase());
        if ((0, ioc_1.isNil)(values))
            return undefined;
        return (0, ioc_1.isArray)(values) && values.length ? values[0] : values;
    }
    setHeader(name, val) {
        return this.set(name, val);
    }
    hasHeader(name) {
        return this.has(name);
    }
    has(name) {
        return this._hdrs.has(name.toLowerCase());
    }
    get(name) {
        return this._hdrs.get(name);
    }
    set(name, val) {
        const key = name.toLowerCase();
        if ((0, ioc_1.isNil)(val)) {
            this._hdrs.delete(key);
            this._rcd = null;
            this._normal.delete(key);
            return this;
        }
        this.setNormalizedName(name, key);
        this._normal.set(key, name);
        this._hdrs.set(key, val);
        this._rcd = null;
        return this;
    }
    append(name, val) {
        if ((0, ioc_1.isNil)(val)) {
            return this;
        }
        const key = name.toLowerCase();
        this.setNormalizedName(name, key);
        if (this._hdrs.has(key)) {
            const old = this._hdrs.get(key);
            let nv;
            if (!(0, ioc_1.isNil)(old)) {
                nv = [...(0, ioc_1.isArray)(old) ? old : [String(old)], ...(0, ioc_1.isArray)(val) ? val : [String(val)]];
            }
            else {
                nv = val;
            }
            this._hdrs.set(key, nv);
        }
        else {
            this._hdrs.set(key, val);
        }
        this._rcd = null;
        return this;
    }
    delete(name) {
        const key = name.toLowerCase();
        this._hdrs.delete(key);
        this._normal.delete(key);
        this._rcd = null;
        return this;
    }
    removeHeader(name) {
        return this.delete(name);
    }
    removeHeaders() {
        this._hdrs.clear();
        this._normal.clear();
        this._rcd = null;
    }
    forEach(fn) {
        Array.from(this._normal.keys())
            .forEach(key => fn(this._normal.get(key), this._hdrs.get(key)));
    }
    setNormalizedName(name, lcName) {
        if (!this._normal.has(lcName)) {
            this._normal.set(lcName, name);
        }
    }
}
exports.HeaderMappings = HeaderMappings;
let HeaderAdapter = class HeaderAdapter {
};
exports.HeaderAdapter = HeaderAdapter;
exports.HeaderAdapter = HeaderAdapter = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], HeaderAdapter);
/**
 * has header.
 */
function hasHeader(headers, header) {
    if (!headers)
        return false;
    if (headers.hasHeader)
        return headers.hasHeader?.(header) === true;
    if (headers.headers) {
        const hdrs = headers.headers;
        return hdrs.hasHeader ? hdrs.hasHeader(header) : (0, ioc_1.isDefined)(hdrs[header]);
    }
    return (0, ioc_1.isDefined)(headers[header]);
}
/**
 *
 * @param headers
 * @param header
 * @param join
 * @returns
 */
function getHeader(headers, header, join) {
    if (!headers)
        return undefined;
    let values;
    if (headers.getHeader) {
        values = headers.getHeader(header);
    }
    else if (headers.headers) {
        const hdrs = headers.headers;
        values = hdrs.getHeader ? hdrs.getHeader(header) : hdrs[header];
    }
    else {
        values = headers[header];
    }
    if ((0, ioc_1.isNil)(values))
        return undefined;
    return (0, ioc_1.isArray)(values) ? (join ? values.join(', ') : String(values[0])) : values;
}
/**
 * get headers
 * @param headers
 * @returns
 */
function getHeaders(headers) {
    if (!headers)
        return headers;
    if (headers.getHeaders)
        return headers.getHeaders?.();
    if (headers.headers) {
        const hdrs = headers.headers;
        return hdrs.getHeaders ? hdrs.getHeaders() : hdrs;
    }
    return headers;
}
/**
* content types.
*/
var ContentType;
(function (ContentType) {
    /**
     * stream, buffer type.
     */
    ContentType.OCTET_STREAM = 'application/octet-stream';
    /**
     * application json.
     */
    ContentType.APPL_JSON = 'application/json';
    /**
     * application json.
     */
    ContentType.APPL_JSON_UTF8 = 'application/json; charset=utf-8';
    /**
     * application javascript.
     */
    ContentType.APPL_JAVASCRIPT = 'application/javascript';
    /**
     * text html.
     */
    ContentType.TEXT_HTML = 'text/html';
    /**
     * text html utf-8.
     */
    ContentType.TEXT_HTML_UTF8 = 'text/html; charset=utf-8';
    /**
     * text plain.
     */
    ContentType.TEXT_PLAIN = 'text/plain';
    /**
     * text plain utf-8.
     */
    ContentType.TEXT_PLAIN_UTF8 = 'text/plain; charset=utf-8';
    /**
     * request default accept.
     */
    ContentType.REQUEST_ACCEPT = 'application/json, text/plain, */*';
    ContentType.X_WWW_FORM_URLENCODED = 'application/x-www-form-urlencoded;charset=UTF-8';
})(ContentType || (exports.ContentType = ContentType = {}));
//# sourceMappingURL=headers.js.map