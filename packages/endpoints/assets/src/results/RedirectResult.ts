import { ResultValue } from '@tsdi/core';
import { RestfulRequestContext } from '@tsdi/endpoints';


/**
 * redirect url
 *
 * @export
 * @class RedirectResult
 * @extends {ResultValue}
 */
export class RedirectResult extends ResultValue {
    constructor(private url: string, private alt?: string) {
        super('text/html')
    }
    async sendValue(ctx: RestfulRequestContext) {
        return ctx.redirect(this.url, this.alt)
    }
}
