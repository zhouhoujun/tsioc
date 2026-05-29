import { ResultValue } from '@tsdi/core';
import { isAcceptsCapableMessageAdapter, encodeUrl, escapeHtml, RequestContext } from '@tsdi/common';

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
        if (!adapter) {
            ctx.setHeader('location', encodeUrl(url));
            ctx.setStatus(302);
            return;
        }

        adapter.setHeader('location', encodeUrl(url));
        adapter.setStatus(302);

        if (isAcceptsCapableMessageAdapter(adapter) && adapter.accepts('html')) {
            adapter.write(`Redirecting to <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>.`);
            return;
        }

        adapter.write(`Redirecting to ${url}.`);
    }
}
