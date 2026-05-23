import { ResultValue } from '@tsdi/core';
import { ContentType, encodeUrl, escapeHtml, NotSupportedException, RequestContext, StatusAdapter } from '@tsdi/common';


/**
 * redirect url
 *
 * @export
 * @class RedirectResult
 * @extends {ResultValue}
 */
export class RedirectResult extends ResultValue {
    constructor(private url: string, private referrer?: string, private alt?: string) {
        super('text/html')
    }
    async sendValue(ctx: RequestContext) {
        // if(!(ctx as RestfulRequestContext).redirect) throw new NotSupportedException();
        // return (ctx as RestfulRequestContext).redirect(this.url, this.alt)

        const statusAdapter = ctx.get(StatusAdapter);
        if (!statusAdapter) throw new NotSupportedException();

        let url = this.url;

        if ('back' === url) url = this.referrer || this.alt || '/';

        const resp = ctx.getResponse();

        resp.setHeader('location', encodeUrl(url));

        // status
        if (!statusAdapter.isRedirect(resp.statusCode)) resp.statusCode = statusAdapter.found;


        // html
        if (ctx.accepts('html')) {
            url = escapeHtml(url);
            resp.type = ContentType.TEXT_HTML_UTF8;
            resp.body = `Redirecting to <a href="${url}">${url}</a>.`;
            return
        }

        // text
        resp.type = ContentType.TEXT_PLAIN_UTF8;
        resp.body = `Redirecting to ${url}.`;

        return resp;
    }
}
