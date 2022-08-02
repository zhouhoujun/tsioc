import { ResultValue } from '@tsdi/core';
import { AssetServerContext } from '../asset.ctx';

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
    async sendValue(ctx: AssetServerContext) {
        return ctx.redirect(this.url, this.alt)
    }
}
