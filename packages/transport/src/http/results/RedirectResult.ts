import { ResultValue } from '@tsdi/core';
import { HttpServerResponse } from '../response';

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
    async sendValue(resp: HttpServerResponse) {
        return resp.redirect(this.url, this.alt);
    }
}
