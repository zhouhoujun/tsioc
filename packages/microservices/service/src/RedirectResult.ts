import { ResultValue } from '@tsdi/core';
import { encodeUrl, escapeHtml, RequestContext, StatusMessageAdapter } from '@tsdi/common';

export class RedirectResult extends ResultValue {
    constructor(private url: string, private referrer?: string, private alt?: string) {
        super('text/html');
    }

    async sendValue(ctx: RequestContext) {
        let url = this.url;
        if (url === 'back') {
            url = this.referrer || this.alt || '/';
        }

        const adapter = ctx.get(StatusMessageAdapter);
        if (!adapter) {
            return;
        }

        adapter.setHeader('location', encodeUrl(url));
        adapter.setStatus(302);

        if (adapter.accepts('html')) {
            adapter.setPayload(`Redirecting to <a href="${escapeHtml(url)}">${escapeHtml(url)}</a>.`);
            return;
        }

        adapter.setPayload(`Redirecting to ${url}.`);
    }
}
