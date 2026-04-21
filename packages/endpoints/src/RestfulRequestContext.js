"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestfulRequestContext = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const common_2 = require("@tsdi/common");
const AbstractRequestContext_1 = require("./AbstractRequestContext");
const Cookies = require("cookies");
/**
 * abstract Restful request context.
 *
 * 支持状态的请求上下文
 */
let RestfulRequestContext = class RestfulRequestContext extends AbstractRequestContext_1.AbstractRequestContext {
    get params() {
        return this.URL.searchParams;
    }
    /**
     * Get full request URL.
     *
     * @return {String}
     * @api public
     */
    get href() {
        return this.URL.href;
    }
    get path() {
        return this.URL.pathname;
    }
    /**
     * Get request pathname .
     */
    get pathname() {
        return this.URL.pathname;
    }
    get query() {
        if (!this._query) {
            const qs = this._query = {};
            this.URL.searchParams?.forEach((v, k) => {
                qs[k] = v;
            });
        }
        return this._query;
    }
    get cookies() {
        if (!this._cookies) {
            this._cookies = new Cookies(this.request, this.response, {
                keys: this.session?.id ? [this.session?.id] : ['endpoints'],
                secure: this.secure
            });
        }
        return this._cookies;
    }
    set cookies(value) {
        this._cookies = value;
    }
    /**
     * Get the search string. Same as the query string
     * except it includes the leading ?.
     *
     * @return {String}
     * @api public
     */
    get search() {
        return this.URL.search;
    }
    /**
     * Set the search string. Same as
     * request.querystring= but included for ubiquity.
     *
     * @param {String} str
     * @api public
     */
    set search(str) {
        this.URL.search = str;
        this._query = null;
    }
    /**
     * Get query string.
     *
     * @return {String}
     * @api public
     */
    get querystring() {
        return this.URL.search?.slice(1);
    }
    /**
     * Set query string.
     *
     * @param {String} str
     * @api public
     */
    set querystring(str) {
        this.search = `?${str}`;
    }
    /**
     * can response stream writeable
     */
    get writable() {
        return this.response.writable != false;
    }
    /**
     * Perform a 302 redirect to `url`.
     *
     * The string "back" is special-cased
     * to provide Referrer support, when Referrer
     * is not present `alt` or "/" is used.
     *
     * Examples:
     *
     *    this.redirect('back');
     *    this.redirect('back', '/index.html');
     *    this.redirect('/login');
     *    this.redirect('http://google.com');
     *
     * @param {String} url
     * @param {String} [alt]
     * @api public
     */
    redirect(url, alt) {
        if (!this.statusAdapter)
            throw new common_1.NotSupportedException();
        if ('back' === url)
            url = this.getHeader('referrer') || alt || '/';
        this.setHeader('location', (0, common_2.encodeUrl)(url));
        // status
        if (!this.statusAdapter.isRedirect(this.status))
            this.status = this.statusAdapter.found;
        // html
        if (this.accepts('html')) {
            url = (0, common_2.escapeHtml)(url);
            this.type = common_2.ContentType.TEXT_HTML_UTF8;
            this.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return;
        }
        // text
        this.type = common_2.ContentType.TEXT_PLAIN_UTF8;
        this.body = `Redirecting to ${url}.`;
    }
};
exports.RestfulRequestContext = RestfulRequestContext;
exports.RestfulRequestContext = RestfulRequestContext = tslib_1.__decorate([
    (0, ioc_1.Abstract)()
], RestfulRequestContext);
//# sourceMappingURL=RestfulRequestContext.js.map