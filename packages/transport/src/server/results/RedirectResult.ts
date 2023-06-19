import { AssetContext, ResultValue } from '@tsdi/core'


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
    async sendValue(ctx: AssetContext) {
        return ctx.redirect(this.url, this.alt)
    }
}
