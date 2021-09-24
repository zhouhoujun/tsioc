import { HttpContext } from '../context';
import { ResultValue } from './ResultValue';

/**
 * redirect url
 *
 * @export
 * @class RedirectResult
 * @extends {ResultValue}
 */
export class RedirectResult extends ResultValue {
    constructor(private url: string, private alt?: string) {
        super('text/html');
    }
    async sendValue(ctx: HttpContext) {
        return ctx.redirect(this.url, this.alt);
    }
}
