import { ResultValue } from '@tsdi/core';
import { isAcceptsCapableMessageAdapter, isResponseCapableMessageAdapter, ContentType, encodeUrl, escapeHtml, RequestContext } from '@tsdi/common';

export class RedirectResult extends ResultValue {
    constructor(private url: string, private referrer?: string, private alt?: string) {
        super('text/html');
    }

    async sendValue(ctx: RequestContext) {
        let url = this.url;
        if (url === 'back') {
            url = this.referrer || this.alt || '/';
        }

        const adapter = ctx.getMessageAdapter();
        if (!isResponseCapableMessageAdapter(adapter) || !adapter.getResponse()) {
            return;
        }
        const response = adapter.getResponse();
        response.setHeader('location', encodeUrl(url));

        const statusCode = Number(response.statusCode);
        if (!(statusCode >= 300 && statusCode < 400)) {
            response.statusCode = 302 as any;
        }

        if (isAcceptsCapableMessageAdapter(adapter) && adapter.accepts('html')) {
            const html = escapeHtml(url);
            response.type = ContentType.TEXT_HTML_UTF8;
            response.body = `Redirecting to <a href="${html}">${html}</a>.`;
            return;
        }

        response.type = ContentType.TEXT_PLAIN_UTF8;
        response.body = `Redirecting to ${url}.`;
        return response;
    }
}
