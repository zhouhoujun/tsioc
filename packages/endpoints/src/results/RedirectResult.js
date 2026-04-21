"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedirectResult = void 0;
const core_1 = require("@tsdi/core");
const common_1 = require("@tsdi/common");
/**
 * redirect url
 *
 * @export
 * @class RedirectResult
 * @extends {ResultValue}
 */
class RedirectResult extends core_1.ResultValue {
    constructor(url, referrer, alt) {
        super('text/html');
        this.url = url;
        this.referrer = referrer;
        this.alt = alt;
    }
    async sendValue(ctx) {
        // if(!(ctx as RestfulRequestContext).redirect) throw new NotSupportedException();
        // return (ctx as RestfulRequestContext).redirect(this.url, this.alt)
        const statusAdapter = ctx.get(common_1.StatusAdapter);
        if (!statusAdapter)
            throw new common_1.NotSupportedException();
        let url = this.url;
        if ('back' === url)
            url = this.referrer || this.alt || '/';
        const resp = ctx.getResponse();
        resp.setHeader('location', (0, common_1.encodeUrl)(url));
        // status
        if (!statusAdapter.isRedirect(resp.statusCode))
            resp.statusCode = statusAdapter.found;
        // html
        if (ctx.accepts('html')) {
            url = (0, common_1.escapeHtml)(url);
            resp.type = common_1.ContentType.TEXT_HTML_UTF8;
            resp.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return;
        }
        // text
        resp.type = common_1.ContentType.TEXT_PLAIN_UTF8;
        resp.body = `Redirecting to ${url}.`;
        return resp;
    }
}
exports.RedirectResult = RedirectResult;
//# sourceMappingURL=RedirectResult.js.map