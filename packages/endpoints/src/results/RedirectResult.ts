import { ResultValue } from '@tsdi/core';
import { ContentType, encodeUrl, escapeHtml, HeaderAdapter, InternalServerException, MimeAdapter, NotSupportedException, RequestContext, StatusAdapter } from '@tsdi/common';
import { RestfulRequestContext } from '../RestfulRequestContext';
import { AcceptsPriority } from '../accepts';


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
        const acceptsPriority = ctx.get(AcceptsPriority);
        const headerAdapter = ctx.get(HeaderAdapter);
        const mimeAdapter = ctx.get(MimeAdapter);
        if (!statusAdapter || !acceptsPriority || !headerAdapter) throw new NotSupportedException();

        let url = this.url;

        if ('back' === url) url = this.referrer || this.alt || '/';

        const resp = ctx.getResponse();

        resp.setHeader('location', encodeUrl(url));

        // status
        if (!statusAdapter.isRedirect(resp.statusCode)) resp.statusCode = statusAdapter.found;


        // html
        if (acceptsPriority.accepts(ctx.getRequest(), headerAdapter, mimeAdapter, 'html')) {
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
