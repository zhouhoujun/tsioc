import { ResultValue } from '@tsdi/core';
import { ctype } from '@tsdi/common';
import { TransportContext } from '../TransportContext';


/**
 * redirect url
 *
 * @export
 * @class RedirectResult
 * @extends {ResultValue}
 */
export class RedirectResult extends ResultValue {
    constructor(private url: string, private alt?: string) {
        super(ctype.TEXT_HTML)
    }
    async sendValue(ctx: TransportContext) {
        return ctx.redirect(this.url, this.alt)
    }
}
