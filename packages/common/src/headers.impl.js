"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultHeaderAdapter = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const headers_1 = require("./headers");
let DefaultHeaderAdapter = class DefaultHeaderAdapter {
    hasHeader(headers, header) {
        return (0, headers_1.hasHeader)(headers, header);
    }
    getHeader(headers, header, join) {
        return (0, headers_1.getHeader)(headers, header, join);
    }
    getHeaders(headers) {
        return (0, headers_1.getHeaders)(headers);
    }
    setHeader(headers, header, value) {
        if (!headers)
            return headers;
        if (headers.setHeader) {
            let res;
            if ((0, ioc_1.isNil)(value)) {
                res = this.removeHeader(headers, header);
            }
            else {
                res = headers.setHeader?.(header, value);
            }
            if ((0, ioc_1.isTypeObject)(res)) {
                headers = res;
            }
        }
        else if (headers.headers) {
            const hdrs = headers.headers;
            if ((0, ioc_1.isNil)(value)) {
                if (hdrs.removeHeader) {
                    hdrs.removeHeader?.(header);
                }
                else {
                    delete hdrs[header.toLowerCase()];
                }
            }
            else {
                if (hdrs.setHeader) {
                    hdrs.setHeader?.(header, value);
                }
                else {
                    hdrs[header.toLowerCase()] = value;
                }
            }
        }
        else {
            if ((0, ioc_1.isNil)(value)) {
                delete headers[header.toLowerCase()];
            }
            else {
                headers[header.toLowerCase()] = value;
            }
        }
        return headers;
    }
    removeHeader(headers, header) {
        if (!headers)
            return headers;
        if (headers.removeHeader) {
            const res = headers.removeHeader?.(header);
            if ((0, ioc_1.isTypeObject)(res)) {
                headers = res;
            }
        }
        else if (headers.headers) {
            const hdrs = headers.headers;
            if (hdrs.removeHeader) {
                hdrs.removeHeader?.(header);
            }
            else {
                delete hdrs[header.toLowerCase()];
            }
        }
        else {
            delete headers[header.toLowerCase()];
        }
        return headers;
    }
    removeHeaders(headers) {
        if (!headers)
            return headers;
        if (headers.removeHeaders) {
            headers.removeHeaders?.();
        }
        else if (headers.headers) {
            const hdrs = headers.headers;
            if (hdrs.removeHeaders) {
                hdrs.removeHeaders?.();
            }
            else {
                Object.keys(headers).forEach(n => {
                    delete hdrs[n];
                });
            }
        }
        else if (headers.getHeaderNames) {
            headers.getHeaderNames?.().forEach(n => this.removeHeader(headers, n));
        }
        else {
            Object.keys(headers).forEach(n => {
                delete headers[n];
            });
        }
        return headers;
    }
    hasContentType(headers) {
        return this.hasHeader(headers, 'content-type');
    }
    getContentType(headers) {
        return this.getHeader(headers, 'content-type');
    }
    setContentType(headers, type) {
        return this.setHeader(headers, 'content-type', type);
    }
    hasContentLength(headers) {
        return this.hasHeader(headers, 'content-length');
    }
    setContentLength(headers, len) {
        return this.setHeader(headers, 'content-length', len);
    }
    getContentLength(headers) {
        const len = this.getHeader(headers, 'content-length') ?? '0';
        return ~~len;
    }
    hasContentEncoding(headers) {
        return this.hasHeader(headers, 'content-encoding');
    }
    getContentEncoding(headers) {
        return this.getHeader(headers, 'content-encoding');
    }
    setContentEncoding(headers, encoding) {
        return this.setHeader(headers, 'content-encoding', encoding);
    }
    getContentDisposition(headers) {
        return this.getHeader(headers, 'content-disposition');
    }
    setContentDisposition(headers, disposition) {
        return this.setHeader(headers, 'content-disposition', disposition);
    }
    hasTransferEncoding(headers) {
        return this.hasHeader(headers, 'transfer-encoding');
    }
    getTransferEncoding(headers) {
        return this.getHeader(headers, 'transfer-encoding');
    }
    setTransferEncoding(headers, encoding) {
        return this.setHeader(headers, 'transfer-encoding', encoding);
    }
    getIdentity(headers) {
        return this.getHeader(headers, 'identity');
    }
    setIdentity(headers, identity) {
        return this.setHeader(headers, 'identity', identity);
    }
    getMethod(headers, prefix) {
        return this.getHeader(headers, prefix ? ':method' : 'method');
    }
    setMethod(headers, method, prefix) {
        return this.setHeader(headers, prefix ? ':method' : 'method', method);
    }
    getPath(headers, prefix) {
        return this.getHeader(headers, prefix ? ':path' : 'path');
    }
    setPath(headers, path, prefix) {
        return this.setHeader(headers, prefix ? ':path' : 'path', path);
    }
    getStatus(headers, prefix) {
        return this.getHeader(headers, prefix ? ':staus' : 'status');
    }
    setStatus(headers, status, prefix) {
        return this.setHeader(headers, prefix ? ':staus' : 'status', status);
    }
    getStatusMessage(headers) {
        return this.getHeader(headers, 'status-message');
    }
    setStatusMessage(headers, statusMessage) {
        return this.setHeader(headers, 'status-message', statusMessage);
    }
    getAccept(headers) {
        return this.getHeader(headers, 'accept');
    }
    setAccept(headers, accept) {
        return this.setHeader(headers, 'accept', accept);
    }
    getAcceptCharset(headers) {
        return this.getHeader(headers, 'accept-charset');
    }
    setAcceptCharset(headers, charset) {
        return this.setHeader(headers, 'accept-charset', charset);
    }
    getAcceptEncoding(headers) {
        return this.getHeader(headers, 'accept-encoding');
    }
    setAcceptEncoding(headers, encodings) {
        return this.setHeader(headers, 'accept-encoding', encodings);
    }
    getAcceptLanguage(headers) {
        return this.getHeader(headers, 'accept-language');
    }
    setAcceptLanguage(headers, languages) {
        return this.setHeader(headers, 'accept-language', languages);
    }
    getLastModified(headers) {
        return this.getHeader(headers, 'last-modified');
    }
    setLastModified(headers, modified) {
        return this.setHeader(headers, 'last-modified', modified);
    }
    getCacheControl(headers) {
        return this.getHeader(headers, 'cache-control');
    }
    setCacheControl(headers, control) {
        return this.setHeader(headers, 'cache-control', control);
    }
    getLocation(headers) {
        return this.getHeader(headers, 'location');
    }
    setLocation(headers, location) {
        return this.setHeader(headers, 'location', location);
    }
};
exports.DefaultHeaderAdapter = DefaultHeaderAdapter;
exports.DefaultHeaderAdapter = DefaultHeaderAdapter = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], DefaultHeaderAdapter);
//# sourceMappingURL=headers.impl.js.map